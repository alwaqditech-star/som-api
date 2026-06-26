import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bid } from './entities/bid.entity';
import { BidsService } from './bids.service';
import { BidsController } from './bids.controller';
import { AuctionsModule } from '../auctions/auctions.module';
import { AuctionGatewayModule } from '../auctions/auction-gateway.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bid]),
    forwardRef(() => AuctionsModule),
    forwardRef(() => AuctionGatewayModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [BidsController],
  providers: [BidsService],
  exports: [BidsService],
})
export class BidsModule {}
