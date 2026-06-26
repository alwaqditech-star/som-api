import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { getDatabaseConfig } from '../config/database.config';
import { User } from '../modules/users/entities/user.entity';
import { Wallet } from '../modules/wallets/entities/wallet.entity';
import { Brand, Category } from '../modules/categories/entities/brand.entity';
import { Vehicle } from '../modules/vehicles/entities/vehicle.entity';
import { VehicleImage } from '../modules/vehicles/entities/vehicle-image.entity';
import { Auction } from '../modules/auctions/entities/auction.entity';
import {
  UserRole,
  UserStatus,
  VehicleStatus,
  VehicleCondition,
  Transmission,
  FuelType,
  AuctionStatus,
  AuctionType,
} from '../common/enums';

config();

async function seed() {
  const db = getDatabaseConfig();
  const dataSource = new DataSource({
    type: 'postgres',
    host: db.host,
    port: db.port,
    username: db.username,
    password: db.password,
    database: db.database,
    entities: ['src/**/*.entity.ts'],
    synchronize: false,
    ssl: db.ssl ? { rejectUnauthorized: false } : false,
  });

  await dataSource.initialize();
  console.log('🌱 بدء تعبئة البيانات...');

  const userRepo = dataSource.getRepository(User);
  const walletRepo = dataSource.getRepository(Wallet);
  const brandRepo = dataSource.getRepository(Brand);
  const categoryRepo = dataSource.getRepository(Category);
  const vehicleRepo = dataSource.getRepository(Vehicle);
  const imageRepo = dataSource.getRepository(VehicleImage);
  const auctionRepo = dataSource.getRepository(Auction);

  const password = await bcrypt.hash('Admin123!', 12);

  let admin = await userRepo.findOne({ where: { email: 'admin@som.sa' } });
  if (!admin) {
    admin = await userRepo.save(
      userRepo.create({
        email: 'admin@som.sa',
        phone: '0500000001',
        password,
        fullName: 'مدير النظام',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        city: 'الرياض',
        isVerified: true,
      }),
    );
    await walletRepo.save(walletRepo.create({ userId: admin.id, balance: 100000 }));
  }

  let seller = await userRepo.findOne({ where: { email: 'seller@som.sa' } });
  if (!seller) {
    seller = await userRepo.save(
      userRepo.create({
        email: 'seller@som.sa',
        phone: '0500000002',
        password,
        fullName: 'معرض السيارات',
        role: UserRole.SELLER,
        status: UserStatus.ACTIVE,
        city: 'جدة',
        isVerified: true,
      }),
    );
    await walletRepo.save(walletRepo.create({ userId: seller.id, balance: 0 }));
  }

  let buyer = await userRepo.findOne({ where: { email: 'buyer@som.sa' } });
  if (!buyer) {
    buyer = await userRepo.save(
      userRepo.create({
        email: 'buyer@som.sa',
        phone: '0500000003',
        password,
        fullName: 'أحمد المزايد',
        role: UserRole.BUYER,
        status: UserStatus.ACTIVE,
        city: 'الرياض',
        isVerified: true,
      }),
    );
    await walletRepo.save(walletRepo.create({ userId: buyer.id, balance: 50000 }));
  }

  const brandsData = [
    { name: 'Toyota', nameAr: 'تويوتا' },
    { name: 'Hyundai', nameAr: 'هيونداي' },
    { name: 'Nissan', nameAr: 'نissan' },
    { name: 'GMC', nameAr: 'جي إم سي' },
    { name: 'Ford', nameAr: 'فورد' },
    { name: 'Chevrolet', nameAr: 'شيفروليه' },
    { name: 'Mercedes-Benz', nameAr: 'مرcedes' },
    { name: 'BMW', nameAr: 'بي إم دبليو' },
    { name: 'Lexus', nameAr: 'لكزس' },
    { name: 'Kia', nameAr: 'كيا' },
  ];

  for (const b of brandsData) {
    const exists = await brandRepo.findOne({ where: { name: b.name } });
    if (!exists) await brandRepo.save(brandRepo.create(b));
  }

  const categoriesData = [
    { name: 'Used Cars', nameAr: 'سيارات مستعملة', description: 'سيارات مستعملة بحالة جيدة' },
    { name: 'Damaged', nameAr: 'سيارات مصدومة', description: 'سيارات بحوادث أو أضرار' },
    { name: 'Fleet', nameAr: 'سيارات حكومية/شركات', description: 'سيارات من مزادات الجهات' },
    { name: 'Salvage', nameAr: 'سيارات تالفة', description: 'سيارات تالفة للتشليح' },
  ];

  for (const c of categoriesData) {
    const exists = await categoryRepo.findOne({ where: { name: c.name } });
    if (!exists) await categoryRepo.save(categoryRepo.create(c));
  }

  const toyota = await brandRepo.findOne({ where: { name: 'Toyota' } });
  const hyundai = await brandRepo.findOne({ where: { name: 'Hyundai' } });
  const usedCat = await categoryRepo.findOne({ where: { name: 'Used Cars' } });

  if (toyota && !(await vehicleRepo.findOne({ where: { vin: 'SOM2022CAMRY001' } }))) {
    const vehicle1 = await vehicleRepo.save(
      vehicleRepo.create({
        sellerId: seller!.id,
        brandId: toyota.id,
        model: 'Camry',
        year: 2022,
        trim: 'GLE',
        vin: 'SOM2022CAMRY001',
        mileage: 45000,
        condition: VehicleCondition.EXCELLENT,
        transmission: Transmission.AUTOMATIC,
        fuelType: FuelType.GASOLINE,
        color: 'أبيض',
        cylinders: 4,
        engineSize: '2.5L',
        description: 'تويوتا كامري 2022 - حالة ممتازة - فحص شامل',
        city: 'الرياض',
        status: VehicleStatus.APPROVED,
      }),
    );
    await imageRepo.save(
      imageRepo.create({
        vehicleId: vehicle1.id,
        url: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800',
        isPrimary: true,
      }),
    );

    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 1);
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 2);

    await auctionRepo.save(
      auctionRepo.create({
        vehicleId: vehicle1.id,
        title: 'مزاد تويوتا كامري 2022 GLE',
        description: 'مزاد مباشر - سيارة بحالة ممتازة',
        type: AuctionType.LIVE,
        status: AuctionStatus.SCHEDULED,
        startingPrice: 75000,
        currentPrice: 75000,
        reservePrice: 85000,
        minBidIncrement: 500,
        depositAmount: 3750,
        startTime,
        endTime,
        actualEndTime: endTime,
        categoryId: usedCat?.id,
        isFeatured: true,
      }),
    );
  }

  if (hyundai && !(await vehicleRepo.findOne({ where: { vin: 'SOM2021SONATA001' } }))) {
    const vehicle2 = await vehicleRepo.save(
      vehicleRepo.create({
        sellerId: seller!.id,
        brandId: hyundai.id,
        model: 'Sonata',
        year: 2021,
        trim: 'Smart',
        vin: 'SOM2021SONATA001',
        mileage: 62000,
        condition: VehicleCondition.GOOD,
        transmission: Transmission.AUTOMATIC,
        fuelType: FuelType.GASOLINE,
        color: 'فضي',
        description: 'هيونداي سونATA 2021 - صيانة دورية',
        city: 'جدة',
        status: VehicleStatus.APPROVED,
      }),
    );
    await imageRepo.save(
      imageRepo.create({
        vehicleId: vehicle2.id,
        url: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
        isPrimary: true,
      }),
    );

    const liveStart = new Date();
    liveStart.setMinutes(liveStart.getMinutes() - 30);
    const liveEnd = new Date();
    liveEnd.setHours(liveEnd.getHours() + 1);

    await auctionRepo.save(
      auctionRepo.create({
        vehicleId: vehicle2.id,
        title: 'مزاد هيونداي سونATA 2021 - مباشر الآن',
        type: AuctionType.LIVE,
        status: AuctionStatus.LIVE,
        startingPrice: 55000,
        currentPrice: 55000,
        minBidIncrement: 500,
        depositAmount: 2750,
        startTime: liveStart,
        endTime: liveEnd,
        actualEndTime: liveEnd,
        categoryId: usedCat?.id,
        isFeatured: true,
      }),
    );
  }

  console.log('✅ تم تعبئة البيانات بنجاح!');
  console.log('');
  console.log('حسابات تجريبية (كلمة المرور: Admin123!):');
  console.log('  Admin:  admin@som.sa');
  console.log('  Seller: seller@som.sa');
  console.log('  Buyer:  buyer@som.sa');

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
