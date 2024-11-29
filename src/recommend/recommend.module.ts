import { Module } from '@nestjs/common';
import { RecommendService } from './recommend.service';
import { RecommendController } from './recommend.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  providers: [RecommendService, PrismaModule],
  controllers: [RecommendController],
})
export class RecommendModule {}
