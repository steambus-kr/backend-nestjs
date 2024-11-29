import { Module } from '@nestjs/common';
import { PlayerCounterService } from './playcounter.service';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, ScheduleModule, PrismaModule],
  providers: [PlayerCounterService],
})
export class PlaycounterModule {}
