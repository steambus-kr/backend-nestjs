import { Module } from '@nestjs/common';
import { PlaycounterService } from './playcounter.service';

@Module({
  providers: [PlaycounterService]
})
export class PlaycounterModule {}
