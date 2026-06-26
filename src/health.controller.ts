import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from './common/decorators';
import { getDatabaseConfig } from './config/database.config';

@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Public()
  @Get()
  async check() {
    const cfg = getDatabaseConfig();
    try {
      const row = await this.dataSource.query(
        'SELECT COUNT(*)::int AS brands FROM brands',
      );
      return {
        status: 'ok',
        database: cfg.database,
        host: cfg.host,
        brands: row[0]?.brands ?? 0,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: 'error',
        database: cfg.database,
        host: cfg.host,
        message,
      };
    }
  }
}
