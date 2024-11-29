import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { RecommendModule } from './recommend/recommend.module';
import { PrismaService } from './prisma.service';
import { ScheduleModule } from '@nestjs/schedule';
import { OutdatorModule } from './outdator/outdator.module';
import { UpdatorModule } from './updator/updator.module';
import { PlaycounterModule } from './playcounter/playcounter.module';

@Module({
  imports: [ScheduleModule.forRoot(), RecommendModule, OutdatorModule, UpdatorModule, PlaycounterModule],
  controllers: [AppController],
  providers: [PrismaService],
})
export class AppModule {}
