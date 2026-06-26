import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { Auction } from '../auctions/entities/auction.entity';
import { ChatsService } from './chats.service';
import { ChatsController } from './chats.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuctionGatewayModule } from '../auctions/auction-gateway.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, ChatMessage, Auction]),
    NotificationsModule,
    forwardRef(() => AuctionGatewayModule),
  ],
  controllers: [ChatsController],
  providers: [ChatsService],
  exports: [ChatsService],
})
export class ChatsModule {}
