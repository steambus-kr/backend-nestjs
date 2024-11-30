import {
  InjectLogger,
  Logged,
  LoggedFunction,
  LoggedInjectable,
  ScopedLogger,
} from 'nestlogged';
import { PrismaService } from '../prisma/prisma.service';
import { IAppDetailsBody, IAppDetailsData } from './types/appdetail.interface';
import { MaxRetryException } from '../exceptions/maxretry.exception';
import { STEAM_RATE_LIMIT_COOLDOWN, TIME } from '../constant';
import { FetchException } from '../exceptions/fetch.exception';
import { BodyFailException } from '../exceptions/bodyfail.exception';
import { JsonException } from '../exceptions/json.exception';
import { ISteamCMDBody, ISteamCMDData } from './types/steamcmd.interface';
import { ISteamSpy } from './types/steamspy.interface';
import { Cron } from '@nestjs/schedule';
import { calculateRatio, formatMs, round } from '../utility';
import { Game } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

const MAX_RETRY = 3;
const MAX_CHUNK_PER_CALL = 4;
const APP_PER_CHUNK = 50;
// 1H CALL
// 200 APP PER 1H
// 4800 APP PER 1D (max)
const CHUNK_BETWEEN_DELAY = 5 * TIME.MINUTE;

export function isKnownException(e: Error): boolean {
  return (
    e instanceof BodyFailException ||
    e instanceof FetchException ||
    e instanceof JsonException ||
    e instanceof MaxRetryException
  );
}

@LoggedInjectable()
export class UpdatorService {
  running: boolean = false;

  /* env */
  disableFetchGameInfo: boolean;

  constructor(
    private db: PrismaService,
    private config: ConfigService,
  ) {
    const disableFetchGameInfo = this.config.get<string>(
      'DISABLE_FETCH_GAME_INFO',
    );

    this.disableFetchGameInfo = disableFetchGameInfo === 'true';
  }

  async getMaxChunk(@InjectLogger logger: ScopedLogger): Promise<number> {
    const max = Math.min(
      Math.floor((await this.db.outdatedGame.count()) / APP_PER_CHUNK),
      MAX_CHUNK_PER_CALL,
    );
    logger.log(`Max chunk is ${max}`);
    return max;
  }

  async getChunk(
    @Logged('index') idx: number,
    @InjectLogger logger: ScopedLogger,
  ): Promise<number[]> {
    const chunk = (
      await this.db.outdatedGame.findMany({
        select: {
          app_id: true,
        },
        orderBy: {
          added_time: 'asc', // older first
          retry: 'asc', // fewer retry first
        },
        skip: idx * APP_PER_CHUNK,
        take: APP_PER_CHUNK,
      })
    ).map(({ app_id }) => app_id);
    logger.log(`Chunk ${idx} has ${chunk.length} games`);
    return chunk;
  }

  @LoggedFunction({ skipCallLog: true, skipReturnLog: true })
  async getAppDetails(
    @Logged('appId') appId: number,
    @Logged('retry')
    retry: { count: number } | null,
    @InjectLogger logger: ScopedLogger,
  ): Promise<IAppDetailsData> {
    if (retry && retry.count >= MAX_RETRY) {
      logger.error(
        `Maximum retry (${retry.count}/${MAX_RETRY}) reached, breaking chain`,
      );
      throw new MaxRetryException();
    }
    const response = await fetch(
      `http://store.steampowered.com/api/appdetails?appids=${appId}`,
    );
    if (!response.ok) {
      switch (response.status) {
        case 429:
        case 403:
          logger.warn(
            `HTTP error while fetching game ${appId} appDetails: ${response.status} ${response.statusText}, will be retried`,
          );
          await new Promise((r) => {
            setTimeout(r, STEAM_RATE_LIMIT_COOLDOWN[response.status]);
          });
          return await this.getAppDetails(
            appId,
            retry ? { count: retry.count + 1 } : { count: 0 },
            logger,
          );
        default:
          logger.error(
            `Unexpected HTTP error while fetching game ${appId} appDetails: ${response.status} ${response.statusText}`,
          );
          throw new FetchException();
      }
    }

    let json: IAppDetailsBody<typeof appId>;
    try {
      json = await response.json();
    } catch (e) {
      logger.error(`Error while parsing ${appId} appDetails json: ${e}`);
      throw new JsonException();
    }

    if (!json[appId].success) {
      logger.error(`Success is not true on ${appId} appDetails json`);
      throw new BodyFailException();
    }
    return {
      ...json[appId].data,
      genres: json[appId].data.genres,
    };
  }

  @LoggedFunction({ skipCallLog: true, skipReturnLog: true })
  async getSteamCMD(
    @Logged('appId') appId: number,
    @InjectLogger logger: ScopedLogger,
  ): Promise<ISteamCMDData> {
    const SteamCMD = await fetch(`https://api.steamcmd.net/v1/info/${appId}`);
    if (!SteamCMD.ok) {
      logger.warn(
        `HTTP error while fetching game ${appId} SteamCMD: ${SteamCMD.status} ${SteamCMD.statusText}`,
      );
      throw new FetchException();
    }
    let SteamCMD_data: ISteamCMDBody<typeof appId>;
    try {
      SteamCMD_data = (await SteamCMD.json()) as ISteamCMDBody<typeof appId>;
    } catch (e) {
      logger.warn(`Error while parsing json from SteamCMD: ${e}`);
      throw new JsonException();
    }

    return SteamCMD_data.data[appId];
  }

  @LoggedFunction({ skipCallLog: true, skipReturnLog: true })
  async getSteamSpy(
    @Logged('appId') appId: number,
    @InjectLogger logger: ScopedLogger,
  ): Promise<ISteamSpy> {
    const SteamSpy = await fetch(
      `https://steamspy.com/api.php?request=appdetails&appid=${appId}`,
    );
    if (!SteamSpy.ok) {
      logger.warn(
        `HTTP error while fetching game ${appId} SteamSpy: ${SteamSpy.status} ${SteamSpy.statusText}`,
      );
      throw new FetchException();
    }
    let SteamSpy_data: ISteamSpy;
    try {
      SteamSpy_data = (await SteamSpy.json()) as ISteamSpy;
    } catch (e) {
      logger.warn(`Error while parsing json from SteamSpy: ${e}`);
      throw new JsonException();
    }

    return SteamSpy_data;
  }

  @LoggedFunction({ skipCallLog: true, skipReturnLog: true })
  async getUpdatedInfo(
    @Logged('appId') appId: number,
    @InjectLogger logger: ScopedLogger,
  ) {
    let appDetails: IAppDetailsData | null = null;
    let steamCMD: ISteamCMDData | null = null;
    let steamSpy: ISteamSpy | null = null;

    try {
      appDetails = await this.getAppDetails(appId, null, logger);
    } catch (e) {
      if (isKnownException(e)) {
        logger.warn(`Failed to fetch appDetails of ${appId}.`);
      } else {
        logger.error(
          `Unexpected error occurred while fetching appDetails of ${appId}: ${e}`,
        );
      }
    }

    try {
      steamCMD = await this.getSteamCMD(appId, logger);
    } catch (e) {
      if (isKnownException(e)) {
        logger.warn(`Failed to fetch steamCMD of ${appId}.`);
      } else {
        logger.error(
          `Unexpected error occurred while fetching steamCMD of ${appId}: ${e}`,
        );
      }
    }

    try {
      steamSpy = await this.getSteamSpy(appId, logger);
    } catch (e) {
      if (isKnownException(e)) {
        logger.warn(`Failed to fetch steamSpy of ${appId}.`);
      } else {
        logger.error(
          `Unexpected error occurred while fetching steamSpy of ${appId}: ${e}`,
        );
      }
    }

    return {
      appDetails,
      steamCMD,
      steamSpy,
    };
  }

  @LoggedFunction({ skipCallLog: true, skipReturnLog: true })
  async buildGameData(
    app_id: number,
    appDetails: IAppDetailsData,
    steamCMD: ISteamCMDData,
    steamSpy: ISteamSpy,
    @InjectLogger logger: ScopedLogger,
  ): Promise<Game> {
    try {
      const releaseDateAsInt = parseInt(
        steamCMD.common?.steam_release_date as `${number}`,
      );

      return {
        app_id,
        title: appDetails.name,
        description: appDetails.short_description,
        thumbnail_src: appDetails.header_image,
        release_date: isNaN(releaseDateAsInt)
          ? null
          : new Date(releaseDateAsInt * 1000),
        owner_count: parseInt(
          steamSpy.owners.split(' .. ')[0].split(',').join(''),
        ),
        review_positive: steamSpy.positive,
        review_negative: steamSpy.negative,
        review_ratio: calculateRatio(steamSpy.positive, steamSpy.negative),
      };
    } catch (e) {
      logger.error(`Failed to build game ${app_id} data:\n${e}`);
      throw e;
    }
  }

  @LoggedFunction({ skipCallLog: true, skipReturnLog: true })
  async buildPartialGameData(
    app_id: number,
    appDetails: IAppDetailsData | null,
    steamCMD: ISteamCMDData | null,
    steamSpy: ISteamSpy | null,
    @InjectLogger logger: ScopedLogger,
  ): Promise<Partial<Game>> {
    try {
      const releaseDateAsInt = steamCMD
        ? parseInt(steamCMD.common?.steam_release_date as `${number}`)
        : NaN;

      return {
        app_id,
        title: appDetails?.name,
        description: appDetails?.short_description,
        thumbnail_src: appDetails?.header_image,
        release_date: isNaN(releaseDateAsInt)
          ? undefined
          : new Date(releaseDateAsInt * 1000),
        owner_count: steamSpy
          ? parseInt(steamSpy.owners.split(' .. ')[0].split(',').join(''))
          : undefined,
        review_positive: steamSpy?.positive,
        review_negative: steamSpy?.negative,
        review_ratio: steamSpy
          ? calculateRatio(steamSpy.positive, steamSpy.negative)
          : undefined,
      };
    } catch (e) {
      logger.error(`Failed to build game ${app_id} partial data:\n${e}`);
      throw e;
    }
  }

  @LoggedFunction({ skipCallLog: true, skipReturnLog: true })
  async markAsFresh(appId: number, @InjectLogger logger: ScopedLogger) {
    try {
      await this.db.outdatedGame.delete({
        where: {
          app_id: appId,
        },
      });
    } catch (e) {
      logger.error(`Failed to mark ${appId} as fresh:\n${e}`);
    }
  }

  @LoggedFunction({ skipCallLog: true, skipReturnLog: true })
  async markRetry(appId: number, @InjectLogger logger: ScopedLogger) {
    try {
      await this.db.outdatedGame.update({
        where: {
          app_id: appId,
        },
        data: {
          retry: {
            increment: 1,
          },
        },
      });
    } catch (e) {
      logger.error(`Failed to increment retry count of outdatedGame ${appId}`);
    }
  }

  @Cron('0 0 * * * *')
  async updator(@InjectLogger logger: ScopedLogger) {
    if (this.running) {
      logger.warn(`Failed to start cron, already running`);
      return;
    }
    this.running = true;
    const startTime = performance.now();

    const maxChunk = await this.getMaxChunk(logger);
    const status: {
      total: number;
      success: number;
      failure: number;
    } = {
      total: 0,
      success: 0,
      failure: 0,
    };

    for (let i = 0; i <= maxChunk; i++) {
      const chunkStatus: typeof status = {
        total: 0,
        success: 0,
        failure: 0,
      };
      const chunk = await this.getChunk(i, logger);
      status.total += chunk.length;
      chunkStatus.total = chunk.length;
      await Promise.all(
        chunk.map(async (appId) => {
          const { appDetails, steamCMD, steamSpy } = await this.getUpdatedInfo(
            appId,
            logger,
          );
          const genreData = appDetails?.genres
            ? {
                connectOrCreate: appDetails.genres.map(
                  ({ id, description }) => ({
                    where: { genre_id: parseInt(id) },
                    create: { genre_id: parseInt(id), genre_name: description },
                  }),
                ),
              }
            : undefined;

          if (!appDetails || !steamCMD || !steamSpy) {
            const appData = await this.db.game.findUnique({
              where: { app_id: appId },
              select: { app_id: true },
            });
            if (!appData) {
              logger.warn(
                `Cannot create game ${appId} because there's failure on data fetch`,
              );
              status.failure++;
              chunkStatus.failure++;
              await this.markRetry(appId, logger);
              return;
            }
            try {
              await this.db.game.update({
                where: {
                  app_id: appId,
                },
                data: {
                  ...(await this.buildPartialGameData(
                    appId,
                    appDetails,
                    steamCMD,
                    steamSpy,
                    logger,
                  )),
                  genres: genreData,
                },
              });
            } catch (e) {
              logger.error(`Failed to update game ${appId}:\n${e}`);
              status.failure++;
              chunkStatus.failure++;
              await this.markRetry(appId, logger);
              return;
            }
          } else {
            try {
              const data = await this.buildGameData(
                appId,
                appDetails,
                steamCMD,
                steamSpy,
                logger,
              );
              await this.db.game.upsert({
                where: {
                  app_id: appId,
                },
                update: {
                  ...data,
                  genres: genreData,
                },
                create: {
                  ...data,
                  genres: genreData,
                },
              });
            } catch (e) {
              logger.error(`Failed to upsert game ${appId}:\n${e}`);
              status.failure++;
              chunkStatus.failure++;
              await this.markRetry(appId, logger);
              return;
            }
          }
          await this.markAsFresh(appId, logger);
          status.success++;
          chunkStatus.success++;
        }),
      );
      logger.log(
        `Chunk ${i + 1} / ${maxChunk} done (${Math.round(((i + 1) / maxChunk) * 100)}%), ${chunkStatus.success} games updated
        ${JSON.stringify(chunkStatus, null, 2)}`,
      );
      if (i !== maxChunk) {
        // skip on last
        await new Promise((r) => setTimeout(r, CHUNK_BETWEEN_DELAY));
      }
    }

    const elapsedTime = performance.now() - startTime;
    logger.log(`Updator finished in ${formatMs(round(elapsedTime, 2))}`);
    this.running = false;
  }
}
