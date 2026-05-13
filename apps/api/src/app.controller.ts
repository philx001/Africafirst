import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/auth.decorator';

@Controller()
export class AppController {
  @Get()
  @Public()
  root() {
    return {
      name: 'CRM Africa First API',
      version: '1.0.0',
      docs: '/api/docs',
      health: '/api/v1/health',
    };
  }

  @Get('health')
  @Public()
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
