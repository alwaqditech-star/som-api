import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { AuctionStatus, AuctionType } from '../../../common/enums';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';
import { User } from '../../users/entities/user.entity';
import { Bid } from '../../bids/entities/bid.entity';
import { AuctionParticipant } from './auction-participant.entity';

@Entity('auctions')
export class Auction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vehicle_id' })
  vehicleId: string;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.auctions)
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: AuctionType, default: AuctionType.LIVE })
  type: AuctionType;

  @Column({ type: 'enum', enum: AuctionStatus, default: AuctionStatus.DRAFT })
  status: AuctionStatus;

  @Column({ name: 'starting_price', type: 'decimal', precision: 14, scale: 2 })
  startingPrice: number;

  @Column({ name: 'current_price', type: 'decimal', precision: 14, scale: 2, default: 0 })
  currentPrice: number;

  @Column({ name: 'reserve_price', type: 'decimal', precision: 14, scale: 2, nullable: true })
  reservePrice: number;

  @Column({ name: 'buy_now_price', type: 'decimal', precision: 14, scale: 2, nullable: true })
  buyNowPrice: number;

  @Column({ name: 'min_bid_increment', type: 'decimal', precision: 14, scale: 2, default: 500 })
  minBidIncrement: number;

  @Column({ name: 'deposit_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  depositAmount: number;

  @Column({ name: 'start_time', type: 'timestamptz', nullable: true })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamptz', nullable: true })
  endTime: Date;

  @Column({ name: 'actual_end_time', type: 'timestamptz', nullable: true })
  actualEndTime: Date;

  @Column({ name: 'winner_id', nullable: true })
  winnerId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'winner_id' })
  winner: User;

  @Column({ name: 'total_bids', default: 0 })
  totalBids: number;

  @Column({ name: 'viewers_count', default: 0 })
  viewersCount: number;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @OneToMany(() => Bid, (bid) => bid.auction)
  bids: Bid[];

  @OneToMany(() => AuctionParticipant, (p) => p.auction)
  participants: AuctionParticipant[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
