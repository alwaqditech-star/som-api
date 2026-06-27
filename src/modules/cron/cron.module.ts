import { Module } from '@nestjs/common';
import { AuctionsModule } from '../auctions/auctions.module';
import { CronController } from './cron.controller';

@Module({
  imports: [AuctionsModule],
  controllers: [CronController],
})
export class CronModule {}
