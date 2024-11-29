import { Module } from '@nestjs/common';
import { UpdatorService } from './updator.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [UpdatorService],
})
export class UpdatorModule {}
