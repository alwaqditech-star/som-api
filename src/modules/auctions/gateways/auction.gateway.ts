import {

  WebSocketGateway,

  WebSocketServer,

  SubscribeMessage,

  OnGatewayConnection,

  OnGatewayDisconnect,

  ConnectedSocket,

  MessageBody,

} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

import { Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import { ConfigService } from '@nestjs/config';

import { AuctionsService } from '../auctions.service';

import { BidsService, BidResult } from '../../bids/bids.service';

import { AuctionStatus } from '../../../common/enums';



interface AuthenticatedSocket extends Socket {

  userId?: string;

  userName?: string;

}



@WebSocketGateway({

  namespace: '/auctions',

  cors: { origin: '*', credentials: true },

  pingInterval: 10000,

  pingTimeout: 5000,

})

export class AuctionGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {

  @WebSocketServer()

  server: Server;



  private readonly logger = new Logger(AuctionGateway.name);



  constructor(

    private jwtService: JwtService,

    private configService: ConfigService,

    @Inject(forwardRef(() => AuctionsService))

    private auctionsService: AuctionsService,

    @Inject(forwardRef(() => BidsService))

    private bidsService: BidsService,

  ) {}



  async onModuleInit() {

    await this.auctionsService.resetLiveViewersCounts();

    this.logger.log('تم تصفير عداد المشاهدين للمزادات المباشرة');

  }



  async handleConnection(client: AuthenticatedSocket) {

    try {

      const token =

        client.handshake.auth?.token ??

        client.handshake.headers?.authorization?.replace('Bearer ', '');



      if (token) {

        const payload = this.jwtService.verify(token, {

          secret: this.configService.get<string>('jwt.secret'),

        });

        client.userId = payload.sub;

        client.userName = payload.email;

        client.join(`user:${payload.sub}`);

      }

      this.logger.log(`Client connected: ${client.id}`);

    } catch {

      this.logger.warn(`Unauthenticated connection: ${client.id}`);

    }

  }



  async handleDisconnect(client: AuthenticatedSocket) {

    const rooms = [...client.rooms].filter(
      (room) => room !== client.id && !room.startsWith('user:'),
    );

    for (const roomId of rooms) {

      await this.syncAndBroadcast(roomId);

      if (client.userId) {

        await this.scheduleInterestOnLeave(roomId, client.userId);

      }

    }

    this.logger.log(`Client disconnected: ${client.id}`);

  }



  private async scheduleInterestOnLeave(auctionId: string, userId: string) {

    const delay =
      this.configService.get<number>('auction.interestReminderDelaySeconds') ?? 30;

    try {

      await this.auctionsService.scheduleInterestReminder(auctionId, userId, delay);

    } catch (error) {

      this.logger.warn(`Interest reminder schedule failed: ${error}`);

    }

  }



  private async getRoomCount(auctionId: string): Promise<number> {

    try {

      const sockets = await this.server.in(auctionId).fetchSockets();

      return sockets.length;

    } catch {

      return 0;

    }

  }



  private async syncAndBroadcast(auctionId: string) {

    const count = await this.getRoomCount(auctionId);

    await this.auctionsService.syncViewersCount(auctionId, count);

    this.server.to(auctionId).emit('viewers_count', { count, auctionId });

    this.server.emit('live_viewers_updated', { auctionId, count });

  }



  private async leaveOtherAuctionRooms(client: AuthenticatedSocket, keepAuctionId: string) {

    for (const roomId of client.rooms) {

      if (roomId === client.id || roomId === keepAuctionId) continue;

      await client.leave(roomId);

      await this.syncAndBroadcast(roomId);

    }

  }



  @SubscribeMessage('join_auction')

  async handleJoinAuction(

    @ConnectedSocket() client: AuthenticatedSocket,

    @MessageBody() data: { auctionId: string },

  ) {

    const { auctionId } = data;

    const auction = await this.auctionsService.findOne(auctionId);



    await this.leaveOtherAuctionRooms(client, auctionId);

    if (client.userId) {

      await this.auctionsService.cancelInterestReminder(auctionId, client.userId);

    }

    await client.join(auctionId);

    await this.syncAndBroadcast(auctionId);



    const bids = await this.bidsService.getAuctionBids(auctionId, 20);

    const count = await this.getRoomCount(auctionId);



    client.emit('auction_state', {

      auction: {

        id: auction.id,

        title: auction.title,

        status: auction.status,

        currentPrice: auction.currentPrice,

        startingPrice: auction.startingPrice,

        minBidIncrement: auction.minBidIncrement,

        endTime: auction.actualEndTime ?? auction.endTime,

        totalBids: auction.totalBids,

        viewersCount: count,

      },

      recentBids: bids.map((b) => ({

        id: b.id,

        amount: b.amount,

        bidderId: b.bidderId,

        bidderName: b.bidder?.fullName ?? 'مزايد',

        createdAt: b.createdAt,

      })),

    });



    return { success: true, auctionId, viewersCount: count };

  }



  @SubscribeMessage('leave_auction')

  async handleLeaveAuction(

    @ConnectedSocket() client: AuthenticatedSocket,

    @MessageBody() data: { auctionId: string },

  ) {

    const { auctionId } = data;

    if (client.rooms.has(auctionId)) {

      await client.leave(auctionId);

    }

    await this.syncAndBroadcast(auctionId);



    if (client.userId) {

      await this.scheduleInterestOnLeave(auctionId, client.userId);

    }



    return { success: true, viewersCount: await this.getRoomCount(auctionId) };

  }



  @SubscribeMessage('place_bid')

  async handlePlaceBid(

    @ConnectedSocket() client: AuthenticatedSocket,

    @MessageBody() data: { auctionId: string; amount: number },

  ) {

    if (!client.userId) {

      return { success: false, error: 'يجب تسجيل الدخول للمزايدة' };

    }



    try {

      const result = await this.bidsService.placeBid(

        data.auctionId,

        client.userId,

        { amount: data.amount },

      );



      const bidPayload = {

        id: result.bid.id,

        auctionId: data.auctionId,

        amount: result.bid.amount,

        bidderId: client.userId,

        bidderName: client.userName ?? result.bid.bidder?.fullName ?? 'مزايد',

        createdAt: result.bid.createdAt,

        totalBids: result.auction.totalBids,

        currentPrice: result.bid.amount,

        endTime: result.auction.actualEndTime ?? result.auction.endTime,

      };



      return { success: true, bid: bidPayload };

    } catch (error) {

      const message = error instanceof Error ? error.message : 'فشلت المزايدة';

      return { success: false, error: message };

    }

  }



  @SubscribeMessage('get_auction_status')

  async handleGetStatus(

    @MessageBody() data: { auctionId: string },

  ) {

    const auction = await this.auctionsService.findOne(data.auctionId);

    return {

      id: auction.id,

      status: auction.status,

      currentPrice: auction.currentPrice,

      endTime: auction.actualEndTime ?? auction.endTime,

      isLive: auction.status === AuctionStatus.LIVE,

      viewersCount: await this.getRoomCount(auction.id),

    };

  }



  async refreshViewers(auctionId: string): Promise<number> {

    await this.syncAndBroadcast(auctionId);

    return await this.getRoomCount(auctionId);

  }



  async refreshAllLiveViewers(): Promise<void> {

    const auctions = await this.auctionsService.findLive();

    for (const auction of auctions) {

      await this.syncAndBroadcast(auction.id);

    }

  }



  broadcastAuctionStarted(auctionId: string, auction: Record<string, unknown>) {

    this.auctionsService.syncViewersCount(auctionId, 0);

    this.server.to(auctionId).emit('auction_started', auction);

    this.server.emit('live_auctions_updated', { auctionId, action: 'started' });

  }



  broadcastBidPlaced(result: BidResult, bidderName?: string) {

    const auctionId = result.bid.auctionId;

    const name = bidderName ?? result.bid.bidder?.fullName ?? 'مزايد';

    const endTime = result.auction.actualEndTime ?? result.auction.endTime;

    const totalBids = result.auction.totalBids;



    const bidPayload = {

      id: result.bid.id,

      auctionId,

      amount: result.bid.amount,

      bidderId: result.bid.bidderId,

      bidderName: name,

      createdAt: result.bid.createdAt,

      totalBids,

      currentPrice: result.bid.amount,

      endTime,

    };



    this.server.to(auctionId).emit('new_bid', bidPayload);



    if (result.previousWinnerId && result.previousWinnerId !== result.bid.bidderId) {

      this.server.to(auctionId).emit('outbid', {

        auctionId,

        outbidUserId: result.previousWinnerId,

        newAmount: result.bid.amount,

      });

    }



    this.server.to(auctionId).emit('auction_updated', {

      auctionId,

      currentPrice: result.bid.amount,

      endTime,

      totalBids,

    });



    this.server.emit('live_bid_updated', {

      auctionId,

      currentPrice: result.bid.amount,

      totalBids,

    });

  }



  broadcastAuctionEnded(auctionId: string, winnerId?: string) {

    this.auctionsService.syncViewersCount(auctionId, 0);

    this.server.to(auctionId).emit('auction_ended', { auctionId, winnerId });

    this.server.emit('live_auctions_updated', { auctionId, action: 'ended' });

  }

  /** إشعار فوري لشريط التلفون عبر Socket */
  pushNotification(userId: string, payload: Record<string, unknown>) {
    this.server.to(`user:${userId}`).emit('push_notification', payload);
  }

}


