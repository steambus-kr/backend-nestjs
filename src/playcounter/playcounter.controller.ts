import {
  Controller,
  Get,
  Headers,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlayerCounterService } from './playcounter.service';
import { InjectLogger, ScopedLogger } from 'nestlogged';
import { TIME } from '../constant';

@Controller('playcounter')
export class PlaycounterController {
  constructor(
    private config: ConfigService,
    private service: PlayerCounterService,
  ) {}

  @Get('/dispatch')
  async dispatch(@Headers('X-ADMIN-KEY') key: string) {
    if (!key || key !== this.config.get<string>('ADMIN_KEY'))
      throw new UnauthorizedException();
    void this.service.playerCounter(undefined as unknown as ScopedLogger);
    return {
      ok: true,
    };
  }

  @Get('/health')
  async health(@InjectLogger logger: ScopedLogger) {
    const time = await this.service.getLastTime(logger);
    if (!time) throw new InternalServerErrorException();
    if (time.getTime() < new Date().getTime() - TIME.HOUR * 2) {
      throw new InternalServerErrorException();
    }
    return {
      ok: true,
    };
  }
}
