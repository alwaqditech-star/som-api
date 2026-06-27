import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Auction } from './entities/auction.entity';
import { AuctionParticipant } from './entities/auction-participant.entity';
import { Watchlist } from './entities/watchlist.entity';
import { AuctionInterestReminder } from './entities/auction-interest-reminder.entity';
import { Bid } from '../bids/entities/bid.entity';
import { AuctionStatus, VehicleStatus, BidStatus, NotificationType, UserRole } from '../../common/enums';
import { CreateAuctionDto, UpdateAuctionDto, AuctionQueryDto } from './dto/auction.dto';
import { VehiclesService } from '../vehicles/vehicles.service';
import { WalletsService } from '../wallets/wallets.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatsService } from '../chats/chats.service';

@Injectable()
export class AuctionsService {
  constructor(
    @InjectRepository(Auction)
    private auctionRepo: Repository<Auction>,
    @InjectRepository(AuctionParticipant)
    private participantRepo: Repository<AuctionParticipant>,
    @InjectRepository(Watchlist)
    private watchlistRepo: Repository<Watchlist>,
    @InjectRepository(Bid)
    private bidRepo: Repository<Bid>,
    @InjectRepository(AuctionInterestReminder)
    private interestReminderRepo: Repository<AuctionInterestReminder>,
    private vehiclesService: VehiclesService,
    private walletsService: WalletsService,
    private notificationsService: NotificationsService,
    private configService: ConfigService,
    private chatsService: ChatsService,
  ) {}

  async create(dto: CreateAuctionDto, sellerId?: string) {
    const vehicle = await this.vehiclesService.findOne(dto.vehicleId);
    if (vehicle.status !== VehicleStatus.APPROVED) {
      throw new BadRequestException('يجب أن تكون السيارة معتمدة قبل إنشاء المزاد');
    }
    if (sellerId && vehicle.sellerId !== sellerId) {
      throw new ForbiddenException('لا يمكنك إنشاء مزاد لسيارة لا تخصك');
    }

    const existing = await this.auctionRepo.findOne({
      where: { vehicleId: dto.vehicleId, status: AuctionStatus.SCHEDULED },
    });
    if (existing) {
      throw new BadRequestException('يوجد مزاد مجدول لهذه السيارة');
    }

    const auction = this.auctionRepo.create({
      ...dto,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      actualEndTime: new Date(dto.endTime),
      currentPrice: dto.startingPrice,
      status: AuctionStatus.SCHEDULED,
    });

    const saved = await this.auctionRepo.save(auction);
    await this.vehiclesService.markInAuction(dto.vehicleId);
    return this.findOne(saved.id);
  }

  async findAll(query: AuctionQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.auctionRepo
      .createQueryBuilder('auction')
      .leftJoinAndSelect('auction.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.brand', 'brand')
      .leftJoinAndSelect('vehicle.images', 'images')
      .leftJoinAndSelect('auction.winner', 'winner');

    if (query.status) qb.andWhere('auction.status = :status', { status: query.status });
    if (query.type) qb.andWhere('auction.type = :type', { type: query.type });
    if (query.isFeatured !== undefined) {
      qb.andWhere('auction.isFeatured = :isFeatured', { isFeatured: query.isFeatured });
    }

    qb.orderBy('auction.startTime', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findLive() {
    return this.auctionRepo.find({
      where: { status: AuctionStatus.LIVE },
      relations: ['vehicle', 'vehicle.brand', 'vehicle.images'],
      order: { endTime: 'ASC' },
    });
  }

  async findOne(id: string) {
    const auction = await this.auctionRepo.findOne({
      where: { id },
      relations: [
        'vehicle',
        'vehicle.brand',
        'vehicle.images',
        'vehicle.seller',
        'winner',
        'participants',
        'participants.user',
      ],
    });
    if (!auction) throw new NotFoundException('المزاد غير موجود');
    return auction;
  }

  async update(id: string, dto: UpdateAuctionDto) {
    const auction = await this.findOne(id);
    if (auction.status === AuctionStatus.LIVE || auction.status === AuctionStatus.ENDED) {
      throw new BadRequestException('لا يمكن تعديل مزاد نشط أو منتهٍ');
    }
    Object.assign(auction, {
      ...dto,
      ...(dto.startTime && { startTime: new Date(dto.startTime) }),
      ...(dto.endTime && {
        endTime: new Date(dto.endTime),
        actualEndTime: new Date(dto.endTime),
      }),
    });
    return this.auctionRepo.save(auction);
  }

  /** تمييز مزاد للظهور في "مزاد مميز" بالرئيسية — مزاد واحد فقط */
  async setFeatured(id: string, isFeatured: boolean) {
    const auction = await this.findOne(id);
    if (auction.status === AuctionStatus.ENDED || auction.status === AuctionStatus.SOLD) {
      throw new BadRequestException('لا يمكن تمييز مزاد منتهٍ أو مباع');
    }
    if (isFeatured) {
      await this.auctionRepo
        .createQueryBuilder()
        .update(Auction)
        .set({ isFeatured: false })
        .where('is_featured = :f', { f: true })
        .execute();
    }
    auction.isFeatured = isFeatured;
    return this.auctionRepo.save(auction);
  }

  async startAuction(id: string) {
    const auction = await this.findOne(id);
    if (auction.status !== AuctionStatus.SCHEDULED) {
      throw new BadRequestException('المزاد ليس في حالة مجدولة');
    }
    auction.status = AuctionStatus.LIVE;
    auction.currentPrice = auction.startingPrice;
    auction.viewersCount = 0;
    return this.auctionRepo.save(auction);
  }

  async endAuction(id: string) {
    const auction = await this.findOne(id);
    if (auction.status !== AuctionStatus.LIVE && auction.status !== AuctionStatus.PAUSED) {
      throw new BadRequestException('يمكن إنهاء المزادات المباشرة فقط');
    }
    return this.finalizeAuction(id);
  }

  async finalizeAuction(id: string) {
    const auction = await this.findOne(id);
    const depositAmount = Number(auction.depositAmount);
    const finalPrice = Number(auction.currentPrice);
    const reservePrice = auction.reservePrice ? Number(auction.reservePrice) : null;

    const winningBid = await this.bidRepo.findOne({
      where: { auctionId: id, status: BidStatus.WINNING },
      order: { amount: 'DESC' },
    });
    let winnerId = winningBid?.bidderId ?? auction.winnerId ?? undefined;

    const hasBids = (auction.totalBids ?? 0) > 0 || winningBid != null;
    const meetsReserve = reservePrice == null || finalPrice >= reservePrice;
    const canSell = Boolean(winnerId && hasBids && meetsReserve);

    const releaseDeposits = async (excludeUserId?: string) => {
      for (const participant of auction.participants ?? []) {
        const deposit = Number(participant.depositPaid);
        if (deposit > 0 && participant.userId !== excludeUserId) {
          await this.walletsService.releaseDeposit(participant.userId, deposit, id);
          await this.notificationsService.create({
            userId: participant.userId,
            type: NotificationType.AUCTION_LOST,
            title: 'انتهى المزاد',
            message: `انتهى مزاد "${auction.title}" — تم إطلاق وديعتك (${deposit} ر.س)`,
            data: { auctionId: id },
          });
        }
      }
    };

    if (canSell && winnerId) {
      const canPay = await this.walletsService.canAffordWinnerPayment(
        winnerId,
        finalPrice,
        depositAmount,
      );

      if (canPay) {
        await releaseDeposits(winnerId);
        await this.walletsService.chargeWinnerPayment(
          winnerId,
          finalPrice,
          depositAmount,
          id,
          auction.title,
        );

        await this.bidRepo.update(
          { auctionId: id, bidderId: winnerId, status: BidStatus.WINNING },
          { status: BidStatus.WON },
        );

        await this.notificationsService.create({
          userId: winnerId,
          type: NotificationType.AUCTION_WON,
          title: 'مبروك! فزت بالمزاد 🎉',
          message: `فزت بمزاد "${auction.title}" بمبلغ ${finalPrice} ر.س — تواصل مع البائع من صفحة المزاد لترتيب التسليم`,
          data: { auctionId: id, amount: finalPrice },
        });

        const sellerId = auction.vehicle?.sellerId;
        if (sellerId) {
          await this.notificationsService.create({
            userId: sellerId,
            type: NotificationType.SYSTEM,
            title: 'تم بيع سيارتك!',
            message: `تم بيع "${auction.title}" بمبلغ ${finalPrice} ر.س — تواصل مع المشتري من صفحة المزاد`,
            data: { auctionId: id, winnerId, amount: finalPrice },
          });
        }

        auction.status = AuctionStatus.SOLD;
        auction.winnerId = winnerId;
        await this.vehiclesService.markSold(auction.vehicleId);
        const saved = await this.auctionRepo.save(auction);
        await this.chatsService.ensureForSoldAuction(id);
        return saved;
      }

      // الفائز لا يملك رصيداً كافياً — إنهاء بدون بيع وإطلاق كل الودائع
      for (const participant of auction.participants ?? []) {
        const deposit = Number(participant.depositPaid);
        if (deposit > 0) {
          await this.walletsService.releaseDeposit(participant.userId, deposit, id);
        }
      }
      await this.notificationsService.create({
        userId: winnerId,
        type: NotificationType.AUCTION_LOST,
        title: 'لم يكتمل البيع',
        message: `انتهى مزاد "${auction.title}" — رصيدك غير كافٍ لإتمام الشراء (${finalPrice} ر.س). تم إطلاق وديعتك.`,
        data: { auctionId: id, amount: finalPrice },
      });
      auction.status = AuctionStatus.ENDED;
      await this.auctionRepo.update(id, { status: AuctionStatus.ENDED, winnerId: null });
      return this.findOne(id);
    }

    await releaseDeposits();
    if (winnerId && !meetsReserve) {
      await this.notificationsService.create({
        userId: winnerId,
        type: NotificationType.AUCTION_LOST,
        title: 'انتهى المزاد',
        message: `انتهى مزاد "${auction.title}" دون بيع — السعر لم يصل للحد الأدنى (السعر الاحتياطي)`,
        data: { auctionId: id },
      });
    }
    await this.auctionRepo.update(id, { status: AuctionStatus.ENDED, winnerId: null });
    return this.findOne(id);
  }

  async joinAuction(auctionId: string, userId: string) {
    const auction = await this.findOne(auctionId);

    const existing = await this.participantRepo.findOne({
      where: { auctionId, userId },
    });
    if (existing) return existing;

    if (Number(auction.depositAmount) > 0) {
      await this.walletsService.lockDeposit(
        userId,
        Number(auction.depositAmount),
        auctionId,
      );
    }

    const participant = this.participantRepo.create({
      auctionId,
      userId,
      depositPaid: Number(auction.depositAmount),
    });
    return this.participantRepo.save(participant);
  }

  async isParticipant(auctionId: string, userId: string): Promise<boolean> {
    const count = await this.participantRepo.count({ where: { auctionId, userId } });
    return count > 0;
  }

  async extendIfNeeded(auction: Auction): Promise<Auction> {
    const extensionSeconds =
      this.configService.get<number>('auction.bidExtensionSeconds') ?? 120;
    const now = new Date();
    const endTime = auction.actualEndTime ?? auction.endTime;
    const secondsRemaining = (endTime.getTime() - now.getTime()) / 1000;

    if (secondsRemaining <= extensionSeconds) {
      const newEnd = new Date(now.getTime() + extensionSeconds * 1000);
      auction.actualEndTime = newEnd;
      return this.auctionRepo.save(auction);
    }
    return auction;
  }

  async updateCurrentPrice(auctionId: string, amount: number, totalBids: number) {
    await this.auctionRepo.update(auctionId, {
      currentPrice: amount,
      totalBids,
    });
  }

  async setWinnerAndPrice(
    auctionId: string,
    winnerId: string,
    amount: number,
    totalBids: number,
  ) {
    await this.auctionRepo.update(auctionId, {
      winnerId,
      currentPrice: amount,
      totalBids,
    });
    return this.findOne(auctionId);
  }

  async syncViewersCount(auctionId: string, count: number) {
    await this.auctionRepo.update(auctionId, { viewersCount: Math.max(0, count) });
  }

  async resetLiveViewersCounts() {
    await this.auctionRepo.update({ status: AuctionStatus.LIVE }, { viewersCount: 0 });
  }

  /** @deprecated use syncViewersCount */
  async incrementViewers(auctionId: string) {
    await this.auctionRepo.increment({ id: auctionId }, 'viewersCount', 1);
  }

  /** @deprecated use syncViewersCount */
  async decrementViewers(auctionId: string) {
    const auction = await this.findOne(auctionId);
    if (auction.viewersCount > 0) {
      await this.auctionRepo.decrement({ id: auctionId }, 'viewersCount', 1);
    }
  }

  async addToWatchlist(userId: string, auctionId: string) {
    await this.findOne(auctionId);
    const existing = await this.watchlistRepo.findOne({ where: { userId, auctionId } });
    if (existing) return existing;
    return this.watchlistRepo.save(this.watchlistRepo.create({ userId, auctionId }));
  }

  async removeFromWatchlist(userId: string, auctionId: string) {
    await this.watchlistRepo.delete({ userId, auctionId });
    return { removed: true };
  }

  async remove(auctionId: string, userId: string, userRole: string) {
    const auction = await this.findOne(auctionId);
    const isStaff = userRole === UserRole.ADMIN || userRole === UserRole.MODERATOR;

    if (auction.status === AuctionStatus.LIVE) {
      throw new BadRequestException('لا يمكن حذف مزاد مباشر — أنهِ المزاد أولاً');
    }

    if (!isStaff) {
      const sellerId = auction.vehicle?.sellerId;
      if (sellerId !== userId) {
        throw new ForbiddenException('لا يمكنك حذف هذا المزاد');
      }
      if (![AuctionStatus.SCHEDULED, AuctionStatus.DRAFT, AuctionStatus.CANCELLED, AuctionStatus.ENDED].includes(auction.status)) {
        throw new BadRequestException(
          'يمكنك حذف المزادات المجدولة أو المنتهية بدون بيع فقط. للمباعة تواصل مع الإدارة',
        );
      }
    }

    await this.watchlistRepo.delete({ auctionId });
    const vehicleId = auction.vehicleId;
    await this.auctionRepo.delete(auctionId);

    const remaining = await this.auctionRepo.count({ where: { vehicleId } });
    if (remaining === 0) {
      const vehicle = await this.vehiclesService.findOne(vehicleId);
      if (
        vehicle.status === VehicleStatus.IN_AUCTION ||
        (isStaff && vehicle.status === VehicleStatus.SOLD)
      ) {
        await this.vehiclesService.setStatus(vehicleId, VehicleStatus.APPROVED);
      }
    }

    return { deleted: true, id: auctionId };
  }

  async getWatchlist(userId: string) {
    return this.watchlistRepo.find({
      where: { userId },
      relations: ['auction', 'auction.vehicle', 'auction.vehicle.brand'],
      order: { createdAt: 'DESC' },
    });
  }

  async getMyWonAuctions(userId: string) {
    return this.auctionRepo.find({
      where: { winnerId: userId, status: AuctionStatus.SOLD },
      relations: ['vehicle', 'vehicle.brand', 'vehicle.images', 'vehicle.seller'],
      order: { actualEndTime: 'DESC', updatedAt: 'DESC' },
    });
  }

  async getContactInfo(auctionId: string, userId: string, userRole: string) {
    const auction = await this.findOne(auctionId);

    if (auction.status !== AuctionStatus.SOLD) {
      throw new BadRequestException('بيانات التواصل متاحة بعد اكتمال البيع فقط');
    }

    const sellerId = auction.vehicle?.sellerId;
    const winnerId = auction.winnerId;
    const isWinner = userId === winnerId;
    const isSeller = userId === sellerId;
    const isStaff = userRole === UserRole.ADMIN || userRole === UserRole.MODERATOR;

    if (!isWinner && !isSeller && !isStaff) {
      throw new ForbiddenException('التواصل متاح للفائز والبائع فقط');
    }

    const seller = auction.vehicle?.seller;
    const winner = auction.winner;

    const toContact = (user: { fullName: string; phone?: string; city?: string; email?: string }) => ({
      fullName: user.fullName,
      phone: user.phone ?? null,
      city: user.city ?? null,
      email: user.email ?? null,
    });

    const nextSteps = [
      'تواصل هاتفياً أو عبر واتساب لترتيب موعد',
      'معاينة السيارة وفحصها',
      'إتمام نقل الملكية واستلام السيارة',
    ];

    if (isStaff) {
      return {
        yourRole: 'admin',
        seller: seller ? toContact(seller) : null,
        buyer: winner ? toContact(winner) : null,
        nextSteps,
      };
    }

    if (isWinner) {
      return {
        yourRole: 'buyer',
        contact: seller ? toContact(seller) : null,
        contactLabel: 'بيانات البائع',
        nextSteps,
      };
    }

    return {
      yourRole: 'seller',
      contact: winner ? toContact(winner) : null,
      contactLabel: 'بيانات المشتري (الفائز)',
      nextSteps,
    };
  }

  async processScheduledAuctions() {
    const now = new Date();
    const toStart = await this.auctionRepo.find({
      where: {
        status: AuctionStatus.SCHEDULED,
        startTime: LessThanOrEqual(now),
        endTime: MoreThanOrEqual(now),
      },
    });
    for (const auction of toStart) {
      await this.startAuction(auction.id);
    }

    const toEnd = await this.auctionRepo.find({
      where: { status: AuctionStatus.LIVE },
    });
    for (const auction of toEnd) {
      const endTime = auction.actualEndTime ?? auction.endTime;
      if (endTime <= now) {
        await this.finalizeAuction(auction.id);
      }
    }
  }

  /** جدولة تذكير من السيرفر — يُستدعى فور مغادرة المزاد بدون مزايدة */
  async scheduleInterestReminder(auctionId: string, userId: string, delaySeconds = 30) {
    const auction = await this.findOne(auctionId);
    if (auction.status !== AuctionStatus.LIVE) {
      return { scheduled: false, reason: 'not_live' };
    }

    const bidCount = await this.bidRepo.count({
      where: { auctionId, bidderId: userId },
    });
    if (bidCount > 0) {
      return { scheduled: false, reason: 'already_bid' };
    }

    const remindAt = new Date(Date.now() + delaySeconds * 1000);
    await this.interestReminderRepo.upsert(
      {
        userId,
        auctionId,
        remindAt,
        cancelled: false,
        sentAt: null,
      },
      ['userId', 'auctionId'],
    );

    return { scheduled: true, remindAt };
  }

  async cancelInterestReminder(auctionId: string, userId: string) {
    await this.interestReminderRepo.update(
      { userId, auctionId },
      { cancelled: true },
    );
    return { cancelled: true };
  }

  /** يُستدعى من Vercel Cron كل دقيقة */
  async processDueInterestReminders() {
    const due = await this.interestReminderRepo.find({
      where: {
        cancelled: false,
        sentAt: IsNull(),
        remindAt: LessThanOrEqual(new Date()),
      },
    });

    let sent = 0;
    for (const row of due) {
      try {
        const result = await this.sendInterestReminder(row.auctionId, row.userId);
        if (result.sent) {
          row.sentAt = new Date();
          await this.interestReminderRepo.save(row);
          sent++;
        } else {
          row.cancelled = true;
          await this.interestReminderRepo.save(row);
        }
      } catch {
        // يُعاد المحاولة في الدورة التالية
      }
    }

    return { processed: due.length, sent };
  }

  /** إشعار «هل ما زلت مهتماً؟» — يُستدعى بعد مغادرة المزاد بدون مزايدة */
  async sendInterestReminder(auctionId: string, userId: string) {
    const auction = await this.findOne(auctionId);
    if (auction.status !== AuctionStatus.LIVE) {
      return { sent: false, reason: 'not_live' };
    }

    const bidCount = await this.bidRepo.count({
      where: { auctionId, bidderId: userId },
    });
    if (bidCount > 0) {
      return { sent: false, reason: 'already_bid' };
    }

    await this.notificationsService.create({
      userId,
      type: NotificationType.AUCTION_INTEREST,
      title: 'هل ما زلت مهتماً؟',
      message: `مزاد «${auction.title}» لا يزال مباشراً — اضغط للعودة والمزايدة`,
      data: { auctionId, type: 'auction_interest' },
    });

    return { sent: true };
  }
}
