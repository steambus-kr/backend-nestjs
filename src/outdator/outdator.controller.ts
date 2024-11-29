import {
  Get,
  Headers,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectLogger, LoggedController, ScopedLogger } from 'nestlogged';
import { OutdatorService } from './outdator.service';
import { TIME } from '../constant';
import { ConfigService } from '@nestjs/config';

@LoggedController('outdator')
export class OutdatorController {
  constructor(
    private config: ConfigService,
    private schedulerRegistry: SchedulerRegistry,
    private service: OutdatorService,
  ) {}

  @Get('/dispatch')
  async dispatch(@Headers('X-ADMIN-KEY') key: string) {
    if (!key || key !== this.config.get<string>('X-ADMIN-KEY'))
      throw new UnauthorizedException();
    this.schedulerRegistry.getCronJob('outdator').start();
    return {
      ok: true,
    };
  }

  @Get('/health')
  async health(@InjectLogger logger: ScopedLogger) {
    const time = await this.service.getLastTime(logger);
    if (!time) throw new InternalServerErrorException();
    if (time.getTime() < new Date().getTime() - TIME.DAY + TIME.HOUR * 2) {
      throw new InternalServerErrorException();
    }
    return {
      ok: true,
    };
  }
}
