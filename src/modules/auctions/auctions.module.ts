import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auction } from './entities/auction.entity';
import { AuctionParticipant } from './entities/auction-participant.entity';
import { Watchlist } from './entities/watchlist.entity';
import { AuctionInterestReminder } from './entities/auction-interest-reminder.entity';
import { Bid } from '../bids/entities/bid.entity';
import { AuctionsService } from './auctions.service';
import { AuctionsController } from './auctions.controller';
import { AuctionSchedulerService } from './auction-scheduler.service';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { WalletsModule } from '../wallets/wallets.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuctionGatewayModule } from './auction-gateway.module';
import { ChatsModule } from '../chats/chats.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Auction, AuctionParticipant, Watchlist, Bid, AuctionInterestReminder]),
    VehiclesModule,
    WalletsModule,
    NotificationsModule,
    forwardRef(() => AuctionGatewayModule),
    forwardRef(() => ChatsModule),
  ],
  controllers: [AuctionsController],
  providers: [AuctionsService, AuctionSchedulerService],
  exports: [AuctionsService],
})
export class AuctionsModule {}
