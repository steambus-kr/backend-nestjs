import { Module } from '@nestjs/common';
import { OutdatorService } from './outdator.service';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { OutdatorController } from './outdator.controller';

@Module({
  imports: [ScheduleModule, ConfigModule, PrismaModule],
  providers: [OutdatorService],
  controllers: [OutdatorController],
})
export class OutdatorModule {}
