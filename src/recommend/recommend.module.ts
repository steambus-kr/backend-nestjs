import { Module } from '@nestjs/common';
import { RecommendService } from './recommend.service';
import { RecommendController } from './recommend.controller';

@Module({
  providers: [RecommendService],
  controllers: [RecommendController],
})
export class RecommendModule {}
