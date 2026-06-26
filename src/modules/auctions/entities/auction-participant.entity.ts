import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Auction } from './auction.entity';
import { User } from '../../users/entities/user.entity';

@Entity('auction_participants')
@Unique(['auctionId', 'userId'])
export class AuctionParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'auction_id' })
  auctionId: string;

  @ManyToOne(() => Auction, (auction) => auction.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auction_id' })
  auction: Auction;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'deposit_paid', type: 'decimal', precision: 14, scale: 2, default: 0 })
  depositPaid: number;

  @Column({ name: 'is_approved', default: true })
  isApproved: boolean;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;
}
