import { LoggedController } from 'nestlogged';
import { Get } from '@nestjs/common';

@LoggedController()
export class AppController {
  constructor() {}

  @Get('/health')
  async health() {
    return {
      ok: true,
    };
  }
}
