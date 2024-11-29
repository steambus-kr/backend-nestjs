import { Module } from '@nestjs/common';
import { PlayerCounterService } from './playcounter.service';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ConfigModule, ScheduleModule],
  providers: [PlayerCounterService],
})
export class PlaycounterModule {}
