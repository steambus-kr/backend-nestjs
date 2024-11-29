import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { RecommendModule } from './recommend/recommend.module';
import { ScheduleModule } from '@nestjs/schedule';
import { OutdatorModule } from './outdator/outdator.module';
import { UpdatorModule } from './updator/updator.module';
import { PlaycounterModule } from './playcounter/playcounter.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot(),
    RecommendModule,
    OutdatorModule,
    UpdatorModule,
    PlaycounterModule,
    PrismaModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
