import { Module } from '@nestjs/common';
import { UpdatorService } from './updator.service';

@Module({
  providers: [UpdatorService]
})
export class UpdatorModule {}
