import {
  InjectLogger,
  LoggedFunction,
  LoggedInjectable,
  ScopedLogger,
} from 'nestlogged';
import { PrismaService } from '../prisma/prisma.service';
import { MaxRetryException } from '../exceptions/maxretry.exception';
import { STEAM_RATE_LIMIT_COOLDOWN } from '../constant';
import { FetchException } from '../exceptions/fetch.exception';
import { IPlayerCountResponse } from './types/playercount.interface';
import { JsonException } from '../exceptions/json.exception';
import { ISteamUserStats } from './types/steamuserstat.interface';
import { BodyFailException } from '../exceptions/bodyfail.exception';
import { Cron } from '@nestjs/schedule';

const MAX_RETRY = 3;
const APP_PER_CHUNK = 200;

@LoggedInjectable()
export class PlayerCounterService {
  running: boolean = false;

  constructor(private db: PrismaService) {}

  @LoggedFunction({ skipCallLog: true, skipReturnLog: true })
  async getPlayerCount(
    appid: number,
    retryCount: number,
    @InjectLogger logger: ScopedLogger,
  ): Promise<IPlayerCountResponse> {
    if (retryCount > MAX_RETRY) {
      logger.error(
        `App ${appid}'s Maximum retry (${retryCount}/${MAX_RETRY}) reached, breaking chain`,
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
          return await this.getPlayerCount(appid, retryCount + 1, logger);
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

    const date = new Date();
    const maxChunk = await this.getMaxChunk(logger);

    for (let idx = 0; idx <= maxChunk; idx++) {
      const chunkReporter = setInterval(() => {
        logger.log(`Processing chunk ${idx}`);
      }, 10000);
      const result = (
        await Promise.all(
          (await this.getChunk(idx, logger)).map(async (appId) => {
            return await (async () => {
              return await this.getPlayerCount(appId, 0, logger);
            })().catch(() => null);
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
      logger.log(`Chunk ${idx} done, ${result.length} games updated`);
      clearInterval(chunkReporter);
    }

    this.running = false;
  }
}
