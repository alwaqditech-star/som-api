import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bid } from './entities/bid.entity';
import { BidStatus, AuctionStatus, NotificationType } from '../../common/enums';
import { PlaceBidDto } from './dto/bid.dto';
import { AuctionsService } from '../auctions/auctions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuctionGateway } from '../auctions/gateways/auction.gateway';

export interface BidResult {
  bid: Bid;
  auction: Awaited<ReturnType<AuctionsService['findOne']>>;
  previousWinnerId?: string;
}

@Injectable()
export class BidsService {
  constructor(
    @InjectRepository(Bid)
    private bidRepo: Repository<Bid>,
    @Inject(forwardRef(() => AuctionsService))
    private auctionsService: AuctionsService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => AuctionGateway))
    private auctionGateway: AuctionGateway,
  ) {}

  async placeBid(
    auctionId: string,
    bidderId: string,
    dto: PlaceBidDto,
  ): Promise<BidResult> {
    const auction = await this.auctionsService.findOne(auctionId);

    if (auction.status !== AuctionStatus.LIVE) {
      throw new BadRequestException('المزاد غير نشط حالياً');
    }

    const isParticipant = await this.auctionsService.isParticipant(
      auctionId,
      bidderId,
    );
    if (!isParticipant) {
      throw new ForbiddenException('يجب الانضمام للمزاد ودفع الوديعة أولاً');
    }

    const minBid =
      Number(auction.currentPrice) + Number(auction.minBidIncrement);
    if (dto.amount < minBid) {
      throw new BadRequestException(
        `الحد الأدنى للمزايدة هو ${minBid} ر.س`,
      );
    }

    const previousWinningBid = await this.bidRepo.findOne({
      where: { auctionId, status: BidStatus.WINNING },
      order: { amount: 'DESC' },
    });

    if (previousWinningBid?.bidderId === bidderId) {
      throw new BadRequestException('أنت صاحب أعلى مزايدة حالياً');
    }

    if (previousWinningBid) {
      previousWinningBid.status = BidStatus.OUTBID;
      await this.bidRepo.save(previousWinningBid);

      await this.notificationsService.create({
        userId: previousWinningBid.bidderId,
        type: NotificationType.BID_OUTBID,
        title: 'تم تجاوز مزايدتك',
        message: `تم تجاوز مزايدتك في مزاد "${auction.title}" - السعر الحالي: ${dto.amount} ر.س`,
        data: { auctionId, newAmount: dto.amount },
      });
    }

    const bid = this.bidRepo.create({
      auctionId,
      bidderId,
      amount: dto.amount,
      status: BidStatus.WINNING,
      isAutoBid: dto.isAutoBid ?? false,
      maxAutoBid: dto.maxAutoBid,
    });
    const savedBid = await this.bidRepo.save(bid);

    const totalBids = await this.bidRepo.count({ where: { auctionId } });
    const updatedAuction = await this.auctionsService.setWinnerAndPrice(
      auctionId,
      bidderId,
      dto.amount,
      totalBids,
    );
    await this.auctionsService.extendIfNeeded(updatedAuction);

    const bidWithBidder = await this.bidRepo.findOne({
      where: { id: savedBid.id },
      relations: ['bidder'],
    });

    const result: BidResult = {
      bid: bidWithBidder ?? savedBid,
      auction: updatedAuction,
      previousWinnerId: previousWinningBid?.bidderId,
    };

    await this.auctionsService.cancelInterestReminder(auctionId, bidderId);

    this.auctionGateway.broadcastBidPlaced(result);

    return result;
  }

  async getAuctionBids(auctionId: string, limit = 50) {
    return this.bidRepo.find({
      where: { auctionId },
      relations: ['bidder'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getUserBids(userId: string) {
    return this.bidRepo.find({
      where: { bidderId: userId },
      relations: ['auction', 'auction.vehicle'],
      order: { createdAt: 'DESC' },
    });
  }
}
