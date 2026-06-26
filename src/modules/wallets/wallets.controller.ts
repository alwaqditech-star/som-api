import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DepositDto, WithdrawDto } from './dto/wallet.dto';

@ApiTags('wallets')
@ApiBearerAuth()
@Controller('wallets')
export class WalletsController {
  constructor(private walletsService: WalletsService) {}

  @Get('me')
  @ApiOperation({ summary: 'محفظتي' })
  getWallet(@CurrentUser('id') userId: string) {
    return this.walletsService.getWallet(userId);
  }

  @Post('deposit')
  @ApiOperation({ summary: 'إيداع في المحفظة' })
  deposit(@CurrentUser('id') userId: string, @Body() dto: DepositDto) {
    return this.walletsService.deposit(userId, dto.amount, dto.description);
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'سحب من المحفظة' })
  withdraw(@CurrentUser('id') userId: string, @Body() dto: WithdrawDto) {
    return this.walletsService.withdraw(userId, dto.amount);
  }
}
