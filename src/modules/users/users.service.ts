import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UserRole, UserStatus } from '../../common/enums';
import {
  UpdateUserDto,
  AdminUpdateUserDto,
  AdminCreateUserDto,
} from './dto/update-user.dto';
import { WalletsService } from '../wallets/wallets.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private walletsService: WalletsService,
  ) {}

  async adminCreate(dto: AdminCreateUserDto) {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('البريد الإلكتروني مسجل مسبقاً');
    }
    if (dto.phone) {
      const existingPhone = await this.findByPhone(dto.phone);
      if (existingPhone) {
        throw new ConflictException('رقم الجوال مسجل مسبقاً');
      }
    }
    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = await this.create({
      email: dto.email,
      phone: dto.phone,
      fullName: dto.fullName,
      city: dto.city,
      password: hashedPassword,
      role: dto.role ?? UserRole.BUYER,
      status: dto.status ?? UserStatus.ACTIVE,
      isVerified: dto.isVerified ?? false,
    });
    await this.walletsService.createWallet(user.id);
    const { password, refreshToken, ...result } = user;
    return result;
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.usersRepo.create(data);
    return this.usersRepo.save(user);
  }

  async save(user: User): Promise<User> {
    return this.usersRepo.save(user);
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { phone } });
  }

  async findByFirebaseUid(firebaseUid: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { firebaseUid } });
  }

  async findAll(page = 1, limit = 20) {
    const [rows, total] = await this.usersRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    const data = rows.map(({ password, refreshToken, fcmToken, ...rest }) => rest);
    return { data, total, page, limit };
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('المستخدم غير موجود');
    Object.assign(user, dto);
    const saved = await this.usersRepo.save(user);
    const { password, refreshToken, fcmToken, ...result } = saved;
    return result;
  }

  async adminUpdate(userId: string, dto: AdminUpdateUserDto) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('المستخدم غير موجود');
    Object.assign(user, dto);
    const saved = await this.usersRepo.save(user);
    const { password, refreshToken, fcmToken, ...result } = saved;
    return result;
  }

  async adminDelete(userId: string, currentUserId: string) {
    if (userId === currentUserId) {
      throw new BadRequestException('لا يمكنك حذف حسابك الخاص');
    }
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('المستخدم غير موجود');

    await this.usersRepo.manager.transaction(async (m) => {
      // معاملات محفظة المستخدم (مرتبطة بالمحفظة وليست بـ CASCADE)
      await m.query(
        'DELETE FROM transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = $1)',
        [userId],
      );
      // رسائل أرسلها المستخدم
      await m.query('DELETE FROM chat_messages WHERE sender_id = $1', [userId]);
      // محادثات يشارك فيها (تحذف رسائلها بالـ CASCADE)
      await m.query(
        'DELETE FROM conversations WHERE seller_id = $1 OR buyer_id = $1',
        [userId],
      );
      // مزايدات المستخدم
      await m.query('DELETE FROM bids WHERE bidder_id = $1', [userId]);
      // مشاركات المزادات
      await m.query('DELETE FROM auction_participants WHERE user_id = $1', [
        userId,
      ]);
      // إزالة المستخدم كفائز من أي مزاد
      await m.query(
        'UPDATE auctions SET winner_id = NULL WHERE winner_id = $1',
        [userId],
      );
      // مزادات سيارات المستخدم (تحذف المزايدات والمشاركات والمحادثات بالـ CASCADE)
      await m.query(
        'DELETE FROM auctions WHERE vehicle_id IN (SELECT id FROM vehicles WHERE seller_id = $1)',
        [userId],
      );
      // سيارات المستخدم (تحذف صورها بالـ CASCADE)
      await m.query('DELETE FROM vehicles WHERE seller_id = $1', [userId]);
      // المستخدم (تحذف المحفظة والإشعارات والمفضلة بالـ CASCADE)
      await m.query('DELETE FROM users WHERE id = $1', [userId]);
    });

    return { success: true, message: 'تم حذف المستخدم نهائياً' };
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    await this.usersRepo.update(userId, { refreshToken });
  }

  async updateFcmToken(userId: string, fcmToken: string | null) {
    await this.usersRepo.update(userId, { fcmToken });
  }

  async getFcmToken(userId: string): Promise<string | null> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      select: ['id', 'fcmToken'],
    });
    return user?.fcmToken ?? null;
  }

  async getProfile(userId: string) {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: ['wallet'],
    });
    if (!user) throw new NotFoundException('المستخدم غير موجود');
    const { password, refreshToken, ...profile } = user;
    return profile;
  }
}
