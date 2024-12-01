import { InjectLogger, LoggedInjectable, ScopedLogger } from 'nestlogged';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { RecommendFilter } from './types/recommend-filter.interface';
import { calculateRatio } from '../utility';

@LoggedInjectable()
export class RecommendService {
  constructor(private db: PrismaService) {}

  async buildFilter(
    exclude: number[],
    filter: Partial<RecommendFilter>,
    @InjectLogger logger: ScopedLogger,
  ): Promise<Prisma.GameWhereInput> {
    const filterObj: Prisma.GameWhereInput = {};
    if (filter.player_min || filter.player_max) {
      filterObj.player_count = {
        some: {
          date: {
            gte: new Date(new Date().getTime() - 1000 * 60 * 60 * 24),
          },
          count: {
            gte: filter.player_min,
            lte: filter.player_max,
          },
        },
      };
    }
    if (filter.owner_min) {
      filterObj.owner_count = {
        gte: filter.owner_min,
      };
    }
    if (filter.review_min || filter.review_max) {
      filterObj.review_total = {
        gte: filter.review_min,
        lte: filter.review_max,
      };
    }
    if (filter.review_ratio_min || filter.review_ratio_max) {
      filterObj.review_ratio = {
        gte: filter.review_ratio_min,
        lte: filter.review_ratio_max,
      };
    }
    if (filter.genre) {
      filterObj.genres = {
        some: {
          genre_name: filter.genre,
        },
      };
    }
    if (exclude.length > 0) {
      filterObj.app_id = {
        notIn: exclude,
      };
    }

    logger.debug(`Final filter:\n${JSON.stringify(filterObj, null, 2)}`);
    return filterObj;
  }

  async getRandomAppId(
    query: Prisma.GameWhereInput,
    @InjectLogger logger: ScopedLogger,
  ) {
    const games = await this.db.game.count({
      where: query,
    });

    logger.log(`Found ${games} apps`);

    if (games === 0) {
      logger.debug(`No app found`);
      return null;
    }

    const randomIndex = await this.getRandomInt(games - 1);
    const randomGame = await this.db.game.findFirst({
      where: query,
      skip: randomIndex,
      take: 1,
      select: {
        app_id: true,
      },
    });

    if (!randomGame) {
      logger.debug(`app index ${randomIndex} returned null`);
      return null;
    }

    logger.debug(`${randomGame.app_id} picked`);
    return randomGame.app_id;
  }

  async getRandomInt(max: number) {
    return Math.floor(Math.random() * max);
  }

  async getGameInfo(
    gameId: number,
    @InjectLogger logger: ScopedLogger,
  ): Promise<IRefinedGameInfo | null> {
    const game = await this.db.game.findUnique({
      where: {
        app_id: gameId,
      },
      include: {
        genres: true,
      },
    });

    if (!game) {
      logger.debug(`Game ${gameId} not found`);
      return null;
    }

    logger.debug(`Game Info:\n${JSON.stringify(game, null, 2)}`);

    const obj_player_count = await this.getPlayerCountData(gameId, logger);

    return {
      app_id: game.app_id,
      title: game.title,
      description: game.description,
      review: {
        positive: game.review_positive,
        negative: game.review_negative,
        ratio:
          game.review_ratio ??
          calculateRatio(game.review_positive, game.review_negative),
      },
      release_date: game.release_date
        ? new Intl.DateTimeFormat('ko', { dateStyle: 'medium' }).format(
            new Date(game.release_date),
          )
        : '-',
      thumbnail_src: game.thumbnail_src,
      owner_min: game.owner_count,
      player_count: {
        latest: obj_player_count.latest
          ? {
              count: obj_player_count.latest.count,
              date: obj_player_count.latest.date.getTime(),
            }
          : null,
        peak: obj_player_count.peak
          ? {
              count: obj_player_count.peak.count,
              date: obj_player_count.peak.date.getTime(),
            }
          : null,
      },
      genres: game.genres.map(({ genre_name }) => genre_name),
    };
  }

  async getPlayerCountData(gameId: number, @InjectLogger logger: ScopedLogger) {
    const whereClause = {
      app_id: gameId,
      date: {
        gte: new Date(new Date().getTime() - 1000 * 60 * 60 * 24),
      },
    };
    const latest = await this.db.playerCount.findFirst({
      where: whereClause,
      orderBy: {
        date: 'desc', // old first
      },
    });
    const peak = await this.db.playerCount.findFirst({
      where: whereClause,
      orderBy: {
        count: 'desc', // many first
      },
    });

    logger.debug(
      `PlayerCountData:\n${JSON.stringify({ latest, peak }, null, 2)}`,
    );

    return {
      latest,
      peak,
    };
  }
}
