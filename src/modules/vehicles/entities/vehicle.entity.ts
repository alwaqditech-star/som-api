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
import {
  VehicleStatus,
  VehicleCondition,
  Transmission,
  FuelType,
} from '../../../common/enums';
import { User } from '../../users/entities/user.entity';
import { Brand } from '../../categories/entities/brand.entity';
import { VehicleImage } from './vehicle-image.entity';
import { Auction } from '../../auctions/entities/auction.entity';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @ManyToOne(() => User, (user) => user.vehicles)
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @Column({ name: 'brand_id' })
  brandId: string;

  @ManyToOne(() => Brand, (brand) => brand.vehicles)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Column()
  model: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ nullable: true })
  trim: string;

  @Column({ name: 'vin', unique: true, nullable: true })
  vin: string;

  @Column({ name: 'plate_number', nullable: true })
  plateNumber: string;

  @Column({ type: 'int', default: 0 })
  mileage: number;

  @Column({ type: 'enum', enum: VehicleCondition, default: VehicleCondition.GOOD })
  condition: VehicleCondition;

  @Column({ type: 'enum', enum: Transmission, default: Transmission.AUTOMATIC })
  transmission: Transmission;

  @Column({ name: 'fuel_type', type: 'enum', enum: FuelType, default: FuelType.GASOLINE })
  fuelType: FuelType;

  @Column({ nullable: true })
  color: string;

  @Column({ type: 'int', nullable: true })
  cylinders: number;

  @Column({ name: 'engine_size', nullable: true })
  engineSize: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  features: string;

  @Column({ nullable: true })
  city: string;

  @Column({ type: 'enum', enum: VehicleStatus, default: VehicleStatus.DRAFT })
  status: VehicleStatus;

  @Column({ name: 'rejection_reason', nullable: true })
  rejectionReason: string;

  @Column({ name: 'is_accident', default: false })
  isAccident: boolean;

  @Column({ name: 'inspection_report_url', nullable: true })
  inspectionReportUrl: string;

  @OneToMany(() => VehicleImage, (img) => img.vehicle, { cascade: true })
  images: VehicleImage[];

  @OneToMany(() => Auction, (auction) => auction.vehicle)
  auctions: Auction[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
