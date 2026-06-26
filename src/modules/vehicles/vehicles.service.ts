import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { VehicleImage } from './entities/vehicle-image.entity';
import { Auction } from '../auctions/entities/auction.entity';
import { Watchlist } from '../auctions/entities/watchlist.entity';
import { VehicleStatus, AuctionStatus, UserRole } from '../../common/enums';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  ReviewVehicleDto,
  VehicleQueryDto,
} from './dto/vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private vehicleRepo: Repository<Vehicle>,
    @InjectRepository(VehicleImage)
    private imageRepo: Repository<VehicleImage>,
    @InjectRepository(Auction)
    private auctionRepo: Repository<Auction>,
    @InjectRepository(Watchlist)
    private watchlistRepo: Repository<Watchlist>,
  ) {}

  async create(sellerId: string, dto: CreateVehicleDto) {
    const { imageUrls, ...vehicleData } = dto;
    const vehicle = this.vehicleRepo.create({
      ...vehicleData,
      sellerId,
      status: VehicleStatus.PENDING_REVIEW,
    });
    const saved = await this.vehicleRepo.save(vehicle);

    if (imageUrls?.length) {
      const images = imageUrls.map((url, index) =>
        this.imageRepo.create({
          vehicleId: saved.id,
          url,
          isPrimary: index === 0,
          sortOrder: index,
        }),
      );
      await this.imageRepo.save(images);
    }

    return this.findOne(saved.id);
  }

  async findAll(query: VehicleQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.vehicleRepo
      .createQueryBuilder('vehicle')
      .leftJoinAndSelect('vehicle.brand', 'brand')
      .leftJoinAndSelect('vehicle.images', 'images')
      .leftJoinAndSelect('vehicle.seller', 'seller');

    if (query.brandId) qb.andWhere('vehicle.brandId = :brandId', { brandId: query.brandId });
    if (query.city) qb.andWhere('vehicle.city = :city', { city: query.city });
    if (query.status) qb.andWhere('vehicle.status = :status', { status: query.status });
    if (query.minYear) qb.andWhere('vehicle.year >= :minYear', { minYear: query.minYear });
    if (query.maxYear) qb.andWhere('vehicle.year <= :maxYear', { maxYear: query.maxYear });

    qb.orderBy('vehicle.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const vehicle = await this.vehicleRepo.findOne({
      where: { id },
      relations: ['brand', 'images', 'seller', 'auctions'],
    });
    if (!vehicle) throw new NotFoundException('السيارة غير موجودة');
    return vehicle;
  }

  async findBySeller(sellerId: string) {
    return this.vehicleRepo.find({
      where: { sellerId },
      relations: ['brand', 'images', 'auctions'],
      order: { createdAt: 'DESC' },
    });
  }

  async findPendingReview() {
    return this.vehicleRepo.find({
      where: { status: VehicleStatus.PENDING_REVIEW },
      relations: ['brand', 'images', 'seller'],
      order: { createdAt: 'ASC' },
    });
  }

  async update(id: string, userId: string, dto: UpdateVehicleDto) {
    const vehicle = await this.findOne(id);
    if (vehicle.sellerId !== userId) {
      throw new ForbiddenException('لا يمكنك تعديل سيارة لا تخصك');
    }
    if (vehicle.status === VehicleStatus.IN_AUCTION || vehicle.status === VehicleStatus.SOLD) {
      throw new BadRequestException('لا يمكن تعديل سيارة في مزاد أو مباعة');
    }

    const { imageUrls, ...vehicleData } = dto;
    Object.assign(vehicle, vehicleData);
    await this.vehicleRepo.save(vehicle);

    if (imageUrls?.length) {
      await this.imageRepo.delete({ vehicleId: id });
      const images = imageUrls.map((url, index) =>
        this.imageRepo.create({
          vehicleId: id,
          url,
          isPrimary: index === 0,
          sortOrder: index,
        }),
      );
      await this.imageRepo.save(images);
    }

    return this.findOne(id);
  }

  async review(id: string, dto: ReviewVehicleDto) {
    const vehicle = await this.findOne(id);
    vehicle.status = dto.status;
    if (dto.rejectionReason) vehicle.rejectionReason = dto.rejectionReason;
    return this.vehicleRepo.save(vehicle);
  }

  async markInAuction(id: string) {
    await this.vehicleRepo.update(id, { status: VehicleStatus.IN_AUCTION });
  }

  async markSold(id: string) {
    await this.vehicleRepo.update(id, { status: VehicleStatus.SOLD });
  }

  async setStatus(id: string, status: VehicleStatus) {
    await this.vehicleRepo.update(id, { status });
  }

  async remove(id: string, userId: string, userRole: string) {
    const vehicle = await this.findOne(id);
    const isStaff = userRole === UserRole.ADMIN || userRole === UserRole.MODERATOR;

    if (!isStaff && vehicle.sellerId !== userId) {
      throw new ForbiddenException('لا يمكنك حذف هذه السيارة');
    }

    const auctions = vehicle.auctions ?? [];
    if (auctions.some((a) => a.status === AuctionStatus.LIVE)) {
      throw new BadRequestException('لا يمكن حذف سيارة في مزاد مباشر — أنهِ المزاد أولاً');
    }
    if (!isStaff && (vehicle.status === VehicleStatus.SOLD || auctions.some((a) => a.status === AuctionStatus.SOLD))) {
      throw new BadRequestException('لا يمكن حذف سيارة مباعة — تواصل مع الإدارة');
    }

    for (const auction of auctions) {
      await this.watchlistRepo.delete({ auctionId: auction.id });
    }
    if (auctions.length > 0) {
      await this.auctionRepo.delete({ vehicleId: id });
    }
    await this.imageRepo.delete({ vehicleId: id });
    await this.vehicleRepo.delete(id);
    return { deleted: true, id };
  }
}
