import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { Auction } from '../auctions/entities/auction.entity';
import { AuctionStatus, NotificationType } from '../../common/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { AuctionGateway } from '../auctions/gateways/auction.gateway';
import { SendMessageDto } from './dto/chat.dto';

@Injectable()
export class ChatsService implements OnModuleInit {
  private auctionGateway: AuctionGateway | null = null;

  constructor(
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(ChatMessage)
    private messageRepo: Repository<ChatMessage>,
    @InjectRepository(Auction)
    private auctionRepo: Repository<Auction>,
    private notificationsService: NotificationsService,
    private moduleRef: ModuleRef,
  ) {}

  onModuleInit() {
    try {
      this.auctionGateway = this.moduleRef.get(AuctionGateway, { strict: false });
    } catch {
      this.auctionGateway = null;
    }
  }

  async ensureForSoldAuction(auctionId: string): Promise<Conversation | null> {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId },
      relations: ['vehicle'],
    });
    if (!auction || auction.status !== AuctionStatus.SOLD) return null;
    if (!auction.winnerId || !auction.vehicle?.sellerId) return null;

    const existing = await this.conversationRepo.findOne({ where: { auctionId } });
    if (existing) return existing;

    const conversation = this.conversationRepo.create({
      auctionId,
      sellerId: auction.vehicle.sellerId,
      buyerId: auction.winnerId,
    });
    return this.conversationRepo.save(conversation);
  }

  private async getConversationForUser(conversationId: string, userId: string) {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: ['auction', 'seller', 'buyer'],
    });
    if (!conversation) throw new NotFoundException('المحادثة غير موجودة');
    if (conversation.sellerId !== userId && conversation.buyerId !== userId) {
      throw new ForbiddenException('لا يمكنك الوصول لهذه المحادثة');
    }
    return conversation;
  }

  async getOrCreateByAuction(auctionId: string, userId: string) {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId },
      relations: ['vehicle', 'winner'],
    });
    if (!auction) throw new NotFoundException('المزاد غير موجود');
    if (auction.status !== AuctionStatus.SOLD) {
      throw new BadRequestException('المحادثة متاحة بعد اكتمال البيع فقط');
    }

    const sellerId = auction.vehicle?.sellerId;
    const buyerId = auction.winnerId;
    if (!sellerId || !buyerId) {
      throw new BadRequestException('لا يوجد بائع أو مشتري لهذا المزاد');
    }
    if (userId !== sellerId && userId !== buyerId) {
      throw new ForbiddenException('المحادثة للبائع والمشتري فقط');
    }

    let conversation = await this.conversationRepo.findOne({
      where: { auctionId },
      relations: ['auction', 'seller', 'buyer'],
    });
    if (!conversation) {
      conversation = await this.conversationRepo.save(
        this.conversationRepo.create({ auctionId, sellerId, buyerId }),
      );
      conversation = await this.conversationRepo.findOne({
        where: { id: conversation.id },
        relations: ['auction', 'seller', 'buyer'],
      });
    }

    return this.toConversationDto(conversation!, userId);
  }

  async listConversations(userId: string) {
    const conversations = await this.conversationRepo.find({
      where: [{ sellerId: userId }, { buyerId: userId }],
      relations: ['auction', 'seller', 'buyer'],
      order: { lastMessageAt: 'DESC', updatedAt: 'DESC' },
    });

    const result = [];
    for (const c of conversations) {
      const lastMessage = await this.messageRepo.findOne({
        where: { conversationId: c.id },
        order: { createdAt: 'DESC' },
      });
      const unread = await this.messageRepo.count({
        where: {
          conversationId: c.id,
          senderId: Not(userId),
          readAt: IsNull(),
        },
      });
      result.push({
        ...this.toConversationDto(c, userId),
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.content,
              senderId: lastMessage.senderId,
              createdAt: lastMessage.createdAt,
            }
          : null,
        unreadCount: unread,
      });
    }
    return result;
  }

  async getMessages(conversationId: string, userId: string, page = 1, limit = 50) {
    await this.getConversationForUser(conversationId, userId);
    const [messages, total] = await this.messageRepo.findAndCount({
      where: { conversationId },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    await this.messageRepo.update(
      { conversationId, senderId: Not(userId), readAt: IsNull() },
      { readAt: new Date() },
    );

    return {
      data: messages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        senderName: m.sender?.fullName ?? 'مستخدم',
        content: m.content,
        createdAt: m.createdAt,
        isMine: m.senderId === userId,
      })),
      total,
      page,
      limit,
    };
  }

  async sendMessage(conversationId: string, userId: string, dto: SendMessageDto) {
    const conversation = await this.getConversationForUser(conversationId, userId);
    const content = dto.content.trim();
    if (!content) throw new BadRequestException('الرسالة فارغة');

    const message = await this.messageRepo.save(
      this.messageRepo.create({
        conversationId,
        senderId: userId,
        content,
      }),
    );

    await this.conversationRepo.update(conversationId, { lastMessageAt: message.createdAt });

    const recipientId =
      conversation.sellerId === userId ? conversation.buyerId : conversation.sellerId;
    const senderName =
      conversation.sellerId === userId
        ? conversation.seller?.fullName
        : conversation.buyer?.fullName;

    const payload = {
      id: message.id,
      conversationId,
      auctionId: conversation.auctionId,
      senderId: userId,
      senderName: senderName ?? 'مستخدم',
      content: message.content,
      createdAt: message.createdAt,
    };

    this.auctionGateway?.pushNotification(recipientId, {
      type: 'chat_message',
      title: 'رسالة جديدة',
      message: `${senderName}: ${content.length > 60 ? content.substring(0, 60) + '…' : content}`,
      data: payload,
    });

    await this.notificationsService.create({
      userId: recipientId,
      type: NotificationType.SYSTEM,
      title: 'رسالة جديدة في المحادثة',
      message: `${senderName}: ${content.length > 80 ? content.substring(0, 80) + '…' : content}`,
      data: { conversationId, auctionId: conversation.auctionId },
    });

    return {
      ...payload,
      isMine: true,
    };
  }

  private toConversationDto(conversation: Conversation, userId: string) {
    const isSeller = conversation.sellerId === userId;
    const other = isSeller ? conversation.buyer : conversation.seller;
    return {
      id: conversation.id,
      auctionId: conversation.auctionId,
      auctionTitle: conversation.auction?.title ?? 'مزاد',
      yourRole: isSeller ? 'seller' : 'buyer',
      otherUser: other
        ? {
            id: other.id,
            fullName: other.fullName,
            phone: other.phone ?? null,
            avatarUrl: other.avatarUrl ?? null,
            isVerified: other.isVerified ?? false,
          }
        : null,
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation.createdAt,
    };
  }
}
