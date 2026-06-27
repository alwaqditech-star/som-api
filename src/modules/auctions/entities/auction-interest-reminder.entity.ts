import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Entity('auction_interest_reminders')
@Unique(['userId', 'auctionId'])
export class AuctionInterestReminder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'auction_id' })
  auctionId: string;

  @Column({ name: 'remind_at', type: 'timestamptz' })
  remindAt: Date;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @Column({ default: false })
  cancelled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
