import { Module } from '@nestjs/common';
import { OutdatorService } from './outdator.service';

@Module({
  providers: [OutdatorService]
})
export class OutdatorModule {}
