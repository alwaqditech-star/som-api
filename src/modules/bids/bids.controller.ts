import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BidsService } from './bids.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators';
import { PlaceBidDto } from './dto/bid.dto';

@ApiTags('bids')
@Controller('bids')
export class BidsController {
  constructor(private bidsService: BidsService) {}

  @ApiBearerAuth()
  @Post('auctions/:auctionId')
  @ApiOperation({ summary: 'تقديم مزايدة (REST - للمزادات المؤقتة)' })
  placeBid(
    @Param('auctionId') auctionId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: PlaceBidDto,
  ) {
    return this.bidsService.placeBid(auctionId, userId, dto);
  }

  @Public()
  @Get('auctions/:auctionId')
  @ApiOperation({ summary: 'سجل مزايدات المزاد' })
  getAuctionBids(
    @Param('auctionId') auctionId: string,
    @Query('limit') limit = 50,
  ) {
    return this.bidsService.getAuctionBids(auctionId, +limit);
  }

  @ApiBearerAuth()
  @Get('my')
  @ApiOperation({ summary: 'مزايداتي' })
  myBids(@CurrentUser('id') userId: string) {
    return this.bidsService.getUserBids(userId);
  }
}
