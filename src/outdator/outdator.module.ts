import { Module } from '@nestjs/common';
import { OutdatorService } from './outdator.service';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ScheduleModule, ConfigModule],
  providers: [OutdatorService],
})
export class OutdatorModule {}
