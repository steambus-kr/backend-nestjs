import { Module } from '@nestjs/common';
import { OutdatorService } from './outdator.service';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ScheduleModule, ConfigModule, PrismaModule],
  providers: [OutdatorService],
})
export class OutdatorModule {}
