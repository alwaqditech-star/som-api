import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BidStatus } from '../../../common/enums';
import { Auction } from '../../auctions/entities/auction.entity';
import { User } from '../../users/entities/user.entity';

@Entity('bids')
@Index(['auctionId', 'createdAt'])
export class Bid {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'auction_id' })
  auctionId: string;

  @ManyToOne(() => Auction, (auction) => auction.bids, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auction_id' })
  auction: Auction;

  @Column({ name: 'bidder_id' })
  bidderId: string;

  @ManyToOne(() => User, (user) => user.bids)
  @JoinColumn({ name: 'bidder_id' })
  bidder: User;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: BidStatus, default: BidStatus.ACTIVE })
  status: BidStatus;

  @Column({ name: 'is_auto_bid', default: false })
  isAutoBid: boolean;

  @Column({ name: 'max_auto_bid', type: 'decimal', precision: 14, scale: 2, nullable: true })
  maxAutoBid: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
