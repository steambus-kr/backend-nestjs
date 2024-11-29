import { InjectLogger, LoggedInjectable, ScopedLogger } from 'nestlogged';
import { PrismaService } from '../prisma/prisma.service';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { STEAM_RATE_LIMIT_COOLDOWN } from '../constant';
import { MaxRetryException } from '../exceptions/maxretry.exception';
import { FetchException } from '../exceptions/fetch.exception';
import { IGetAppList } from './types/getapplist.interface';
import { JsonException } from '../exceptions/json.exception';
import { formatMs, round } from '../utility';

const MAX_RETRY = 3;

@LoggedInjectable()
export class OutdatorService {
  running: boolean = false;

  /* env */
  steamKey: string;
  appStateId: number;

  constructor(
    private db: PrismaService,
    private config: ConfigService,
  ) {
    const steamKey = this.config.get<string>('STEAM_KEY');
    const appStateId = this.config.get<number>('APP_STATE_ID');
    if (!steamKey) throw new Error('STEAM_KEY not set.');
    if (!appStateId) throw new Error('APP_STATE_ID not set.');

    this.steamKey = steamKey;
    this.appStateId = appStateId;
  }

  private async getLastTime(
    @InjectLogger logger: ScopedLogger,
  ): Promise<Date | null> {
    const state = await this.db.state.findUnique({
      where: {
        id: this.appStateId,
      },
      select: {
        last_fetched_info: true,
      },
    });

    if (!state) {
      logger.warn(`No state found, creating new one`);
      const newState = {
        id: this.appStateId,
      };
      await this.db.state.create({
        data: newState,
      });
      return null;
    }

    logger.log(
      `State found, last_fetched_info=${state.last_fetched_info ? state.last_fetched_info.getTime() : 'null'}`,
    );
    return state.last_fetched_info;
  }

  private async getAppListIteration(
    lastFetched: Date | null,
    lastAppId: number | null,
    retry: {
      count: number;
    } | null,
    @InjectLogger logger: ScopedLogger,
  ): Promise<IGetAppList> {
    if (retry && retry?.count >= MAX_RETRY) {
      logger.error(`Failed to fetch GetAppList after ${MAX_RETRY} retries`);
      throw new MaxRetryException();
    }

    const GetAppList_SearchParams = new URLSearchParams([
      ['key', process.env.STEAM_KEY!],
      ['include_games', 'true'],
      ['include_dlc', 'false'],
      ['include_software', 'false'],
      ['include_videos', 'false'],
      ['include_hardware', 'false'],
    ]);
    if (lastFetched !== null)
      GetAppList_SearchParams.append(
        'if_modified_since',
        (lastFetched.getTime() / 1000).toString(),
      );
    if (lastAppId !== null)
      GetAppList_SearchParams.append('last_appid', lastAppId.toString());
    logger.log(
      `Built SearchParams for GetAppList: ${GetAppList_SearchParams.toString()}`,
    );

    // 스팀 API 개발자 대가리 존나 쎄게 치고싶다
    const GetAppList = await fetch(
      `https://api.steampowered.com/IStoreService/GetAppList/v1?${GetAppList_SearchParams.toString()}`,
    );

    if (!GetAppList.ok) {
      switch (GetAppList.status) {
        case 403:
        case 429:
          logger.warn(
            `Rate limited GetAppList, status=${GetAppList.status}, retrying`,
          );
          await new Promise((r) =>
            setTimeout(r, STEAM_RATE_LIMIT_COOLDOWN[GetAppList.status]),
          );
          return await this.getAppListIteration(
            lastFetched,
            lastAppId,
            retry ? { count: retry.count + 1 } : { count: 0 },
            logger,
          );
        default:
          logger.error(
            `Failed to fetch GetAppList, status=${GetAppList.status}`,
          );
          throw new FetchException();
      }
    }

    let GetAppListData: IGetAppList;
    try {
      GetAppListData = await GetAppList.json();
    } catch (e) {
      logger.error(
        `Unexpected error occurred while parsing GetAppList body: ${e}`,
      );
      throw new JsonException();
    }

    return GetAppListData;
  }

  @Cron('0 0 0 * * *', { name: 'outdator', timeZone: 'Asia/Seoul' })
  async outdator(@InjectLogger logger: ScopedLogger) {
    if (this.running) {
      logger.warn(`Failed to start cron, already running`);
      return;
    }
    this.running = true;
    const startTime = performance.now();

    const lastFetched = await this.getLastTime(logger);

    let haveMoreResults = true;
    let lastAppId: number | null = null;
    while (haveMoreResults) {
      const appList = await this.getAppListIteration(
        lastFetched,
        lastAppId,
        null,
        logger,
      );
      haveMoreResults = appList.response.have_more_results;
      lastAppId = appList.response.last_appid;
      await Promise.all(
        appList.response.apps.map(async ({ appid }) => {
          await this.db.outdatedGame.upsert({
            where: {
              app_id: appid,
            },
            create: {
              app_id: appid,
            },
            update: {
              app_id: appid,
            },
          });
        }),
      );
    }

    try {
      await this.db.state.update({
        where: {
          id: this.appStateId,
        },
        data: {
          last_fetched_info: new Date(),
        },
      });
    } catch (e) {
      logger.error(`Failed to update state:\n${e}`);
    }

    const elapsedTime = performance.now() - startTime;
    logger.log(`Outdator done in ${formatMs(round(elapsedTime, 2))}`);
    this.running = false;
  }
}
