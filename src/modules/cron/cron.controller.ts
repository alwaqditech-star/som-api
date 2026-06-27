import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { AuctionsService } from '../auctions/auctions.service';

@ApiTags('cron')
@Controller('cron')
export class CronController {
  constructor(private auctionsService: AuctionsService) {}

  @Public()
  @Get('interest-reminders')
  @ApiOperation({ summary: 'Vercel Cron — إرسال تذكيرات «هل ما زلت مهتماً؟»' })
  async processInterestReminders(@Headers('authorization') auth?: string) {
    const secret = process.env.CRON_SECRET;
    if (secret && auth !== `Bearer ${secret}`) {
      throw new UnauthorizedException('Invalid cron secret');
    }
    return this.auctionsService.processDueInterestReminders();
  }
}
