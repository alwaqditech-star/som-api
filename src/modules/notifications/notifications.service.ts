import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationType } from '../../common/enums';
import { AuctionGateway } from '../auctions/gateways/auction.gateway';
import { FirebaseService } from '../firebase/firebase.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private auctionGateway: AuctionGateway | null = null;

  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    private moduleRef: ModuleRef,
    private firebaseService: FirebaseService,
    private usersService: UsersService,
  ) {}

  onModuleInit() {
    this.resolveGateway();
  }

  private resolveGateway(): AuctionGateway | null {
    if (this.auctionGateway) return this.auctionGateway;
    try {
      this.auctionGateway = this.moduleRef.get(AuctionGateway, { strict: false });
    } catch {
      this.auctionGateway = null;
    }
    return this.auctionGateway;
  }

  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }) {
    const notification = this.notificationRepo.create(data);
    const saved = await this.notificationRepo.save(notification);

    this.resolveGateway()?.pushNotification(data.userId, {
      id: saved.id,
      type: saved.type,
      title: saved.title,
      message: saved.message,
      data: saved.data ?? {},
      createdAt: saved.createdAt,
    });

    const fcmToken = await this.usersService.getFcmToken(data.userId);
    if (fcmToken) {
      const dataPayload: Record<string, string> = {
        id: saved.id,
        type: saved.type,
        title: saved.title,
        message: saved.message,
      };
      if (saved.data) {
        for (const [key, value] of Object.entries(saved.data)) {
          dataPayload[key] = String(value);
        }
      }
      const sent = await this.firebaseService.sendPushToDevice(fcmToken, {
        title: saved.title,
        body: saved.message,
        data: dataPayload,
      });
      if (sent) {
        this.logger.log(`FCM sent to user ${data.userId}`);
      }
    } else {
      this.logger.warn(
        `No FCM token for user ${data.userId} — open app on phone and allow notifications`,
      );
    }

    return saved;
  }

  async registerFcmToken(userId: string, token: string) {
    await this.usersService.updateFcmToken(userId, token);
    this.logger.log(`FCM token saved for user ${userId}`);
    return { success: true };
  }

  async clearFcmToken(userId: string) {
    await this.usersService.updateFcmToken(userId, null);
    return { success: true };
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const [data, total] = await this.notificationRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async markAsRead(userId: string, notificationId: string) {
    await this.notificationRepo.update(
      { id: notificationId, userId },
      { isRead: true },
    );
    return { success: true };
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepo.update({ userId, isRead: false }, { isRead: true });
    return { success: true };
  }

  async getUnreadCount(userId: string) {
    const count = await this.notificationRepo.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async getLatest(userId: string) {
    return this.notificationRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
