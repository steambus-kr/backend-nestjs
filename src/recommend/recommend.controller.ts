import {
  InjectLogger,
  Logged,
  LoggedController,
  ScopedLogger,
} from 'nestlogged';
import { Body, NotFoundException, Post } from '@nestjs/common';
import { RecommendBodyDto } from './dto/recommend-filter.dto';
import { RecommendService } from './recommend.service';

@LoggedController('game')
export class RecommendController {
  constructor(private recommendService: RecommendService) {}

  @Post('/recommend')
  async getGameRecommendation(
    @Logged('body') @Body() body: RecommendBodyDto,
    @InjectLogger logger: ScopedLogger,
  ) {
    const query = await this.recommendService.buildFilter(
      body.exclude,
      body.filter,
      logger,
    );
    const gameId = await this.recommendService.getRandomAppId(query, logger);
    if (!gameId) throw new NotFoundException();
    const content = await this.recommendService.getGameInfo(gameId, logger);
    if (!content) throw new NotFoundException();
    return content;
  }
}
