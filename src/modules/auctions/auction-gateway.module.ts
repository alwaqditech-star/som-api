import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuctionGateway } from './gateways/auction.gateway';
import { AuctionsModule } from './auctions.module';
import { BidsModule } from '../bids/bids.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => AuctionsModule),
    forwardRef(() => BidsModule),
  ],
  providers: [AuctionGateway],
  exports: [AuctionGateway],
})
export class AuctionGatewayModule {}
