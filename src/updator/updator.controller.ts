import {
  Controller,
  Get,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { UpdatorService } from './updator.service';
import { ConfigService } from '@nestjs/config';
import { ScopedLogger } from 'nestlogged';

@Controller('updator')
export class UpdatorController {
  constructor(
    private service: UpdatorService,
    private config: ConfigService,
  ) {}

  @Get('/dispatch')
  async dispatch(@Headers('X-ADMIN-KEY') key: string) {
    if (!key || key !== this.config.get<string>('ADMIN_KEY'))
      throw new UnauthorizedException();
    void this.service.updator(undefined as unknown as ScopedLogger);
    return { ok: true };
  }
}
