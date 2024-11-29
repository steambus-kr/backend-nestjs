import {
  InjectLogger,
  LoggedFunction,
  LoggedInjectable,
  ScopedLogger,
} from 'nestlogged';
import { PrismaService } from '../prisma/prisma.service';
import { MaxRetryException } from '../exceptions/maxretry.exception';
import { STEAM_RATE_LIMIT_COOLDOWN, TIME } from '../constant';
import { FetchException } from '../exceptions/fetch.exception';
import { IPlayerCountResponse } from './types/playercount.interface';
import { JsonException } from '../exceptions/json.exception';
import { ISteamUserStats } from './types/steamuserstat.interface';
import { BodyFailException } from '../exceptions/bodyfail.exception';
import { Cron } from '@nestjs/schedule';
import { formatMs, round } from '../utility';

const MAX_RETRY = 3;
const APP_PER_CHUNK = 200;

@LoggedInjectable()
export class PlayerCounterService {
  running: boolean = false;

  constructor(private db: PrismaService) {}

  @LoggedFunction({ skipCallLog: true, skipReturnLog: true })
  async getPlayerCount(
    appid: number,
    retry: { count: number } | null,
    @InjectLogger logger: ScopedLogger,
  ): Promise<IPlayerCountResponse> {
    if (retry && retry.count > MAX_RETRY) {
      logger.error(
        `App ${appid}'s Maximum retry (${retry.count}/${MAX_RETRY}) reached, breaking chain`,
      );
      throw new MaxRetryException();
    }
    const response = await fetch(
      `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appid}`,
    );
    if (!response.ok) {
      switch (response.status) {
        case 404:
          return {
            appId: appid,
            count: 0,
          };
        case 429:
        case 403:
          logger.error(
            `Rate limited GetNumberOfCurrentPlayer of ${appid}, by ${response.status}, will be retried`,
          );
          await new Promise((r) => {
            setTimeout(r, STEAM_RATE_LIMIT_COOLDOWN[response.status]);
          });
          return await this.getPlayerCount(
            appid,
            retry ? { count: retry.count + 1 } : { count: 0 },
            logger,
          );
        default:
          logger.error(
            `Failed to fetch PlayerCount of ${appid} by ${response.status}`,
          );
          throw new FetchException();
      }
    }

    let responseJson: ISteamUserStats;
    try {
      responseJson = (await response.json()) as ISteamUserStats;
    } catch (e) {
      logger.error(`Error while parsing json from app ${appid}`);
      throw new JsonException();
    }

    if (responseJson.response.result !== 1) {
      logger.error(`app ${appid} response's body marked as fail`);
      throw new BodyFailException();
    }

    return {
      appId: appid,
      count: responseJson.response.player_count,
    };
  }

  async getMaxChunk(@InjectLogger logger: ScopedLogger) {
    const maxChunk = Math.floor((await this.db.game.count()) / APP_PER_CHUNK);
    logger.log(`Max chunk is ${maxChunk}`);
    return maxChunk;
  }

  @LoggedFunction({ skipCallLog: true, skipReturnLog: true })
  async getChunk(
    chunkIdx: number,
    @InjectLogger logger: ScopedLogger,
  ): Promise<number[]> {
    const chunk = await this.db.game.findMany({
      select: {
        app_id: true,
      },
      skip: chunkIdx * APP_PER_CHUNK,
      take: APP_PER_CHUNK,
    });
    logger.log(`Chunk ${chunkIdx} has ${chunk.length} games`);
    return chunk.map(({ app_id }) => app_id);
  }

  @Cron('0 */30 * * * *')
  async playerCounter(@InjectLogger logger: ScopedLogger) {
    if (this.running) {
      logger.warn(`Failed to start cron, already running`);
      return;
    }
    this.running = true;
    const startTime = performance.now();

    const date = new Date();
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

    for (let idx = 0; idx <= maxChunk; idx++) {
      const chunk = await this.getChunk(idx, logger);
      const chunkStatus: typeof status = {
        total: chunk.length,
        success: 0,
        failure: 0,
      };
      status.total += chunk.length;
      const result = (
        await Promise.all(
          chunk.map(async (appId) => {
            return await (async () => {
              return await this.getPlayerCount(appId, null, logger);
            })().catch(() => {
              status.failure++;
              chunkStatus.failure++;
              return null;
            });
          }),
        )
      ).filter((r) => r !== null);
      await this.db.playerCount.createMany({
        data: result.map(({ appId, count }) => ({
          app_id: appId,
          count,
          date,
        })),
      });
      chunkStatus.success += result.length;
      status.success += result.length;
      logger.log(
        `Chunk ${idx} / ${maxChunk} done (${Math.round((idx / maxChunk) * 100)}%), ${result.length} games updated
        ${JSON.stringify(chunkStatus, null, 2)}`,
      );
    }

    logger.log(
      `Successfully done, ${maxChunk} chunk saved
      ${JSON.stringify(status, null, 2)}`,
    );

    await this.removeOldRecords(new Date(), logger);

    try {
      await this.db.state.update({
        where: {
          id: 1,
        },
        data: {
          last_fetched_pc: new Date(),
        },
      });
    } catch (e) {
      logger.error(`Failed to update state:\n${e}`);
    }

    const elapsedTime = performance.now() - startTime;
    logger.log(`playerCounter done in ${formatMs(round(elapsedTime, 2))}`);
    this.running = false;
  }

  async removeOldRecords(baseDate: Date, @InjectLogger logger: ScopedLogger) {
    const deletedCount = await this.db.playerCount.deleteMany({
      where: {
        date: {
          lte: new Date(baseDate.getTime() - TIME.DAY),
        },
      },
    });
    logger.log(`Deleted ${deletedCount.count} records`);
  }
}
