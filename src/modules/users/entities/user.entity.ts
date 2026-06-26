import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole, UserStatus } from '../../../common/enums';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';
import { Bid } from '../../bids/entities/bid.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { Watchlist } from '../../auctions/entities/watchlist.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true, nullable: true })
  phone: string;

  @Column({ nullable: true })
  @Exclude()
  password: string;

  @Column({ name: 'firebase_uid', unique: true, nullable: true })
  firebaseUid: string;

  @Column({ name: 'auth_provider', default: 'local' })
  authProvider: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ name: 'national_id', unique: true, nullable: true })
  nationalId: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.BUYER })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Column({ name: 'city', nullable: true })
  city: string;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'refresh_token', nullable: true })
  @Exclude()
  refreshToken: string;

  @Column({ name: 'fcm_token', type: 'text', nullable: true })
  @Exclude()
  fcmToken: string | null;

  @OneToOne(() => Wallet, (wallet) => wallet.user)
  wallet: Wallet;

  @OneToMany(() => Vehicle, (vehicle) => vehicle.seller)
  vehicles: Vehicle[];

  @OneToMany(() => Bid, (bid) => bid.bidder)
  bids: Bid[];

  @OneToMany(() => Notification, (n) => n.user)
  notifications: Notification[];

  @OneToMany(() => Watchlist, (w) => w.user)
  watchlist: Watchlist[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
