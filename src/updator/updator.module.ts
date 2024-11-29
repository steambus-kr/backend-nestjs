import { Module } from '@nestjs/common';
import { UpdatorService } from './updator.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UpdatorController } from './updator.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [UpdatorService],
  controllers: [UpdatorController],
})
export class UpdatorModule {}
