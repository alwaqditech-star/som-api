import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { WalletsService } from '../wallets/wallets.service';
import { FirebaseService } from '../firebase/firebase.service';
import { RegisterDto, LoginDto, RefreshTokenDto, GoogleLoginDto, GoogleCompleteRegisterDto } from './dto/auth.dto';
import { UserStatus, UserRole } from '../../common/enums';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private walletsService: WalletsService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private firebaseService: FirebaseService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('البريد الإلكتروني مسجل مسبقاً');
    }

    if (dto.phone) {
      const existingPhone = await this.usersService.findByPhone(dto.phone);
      if (existingPhone) {
        throw new ConflictException('رقم الجوال مسجل مسبقاً');
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const safeRole =
      dto.role === UserRole.SELLER ? UserRole.SELLER : UserRole.BUYER;
    const user = await this.usersService.create({
      ...dto,
      role: safeRole,
      password: hashedPassword,
      status: UserStatus.ACTIVE,
    });

    await this.walletsService.createWallet(user.id);

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    const { password, refreshToken, ...result } = user;
    return { user: result, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException(
        'البريد غير مسجل — أنشئ حساباً جديداً من صفحة التسجيل',
      );
    }

    if (!user.password) {
      throw new UnauthorizedException('هذا الحساب مسجّل عبر Google — استخدم تسجيل الدخول بجوجل');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('تم تعليق حسابك - تواصل مع الدعم');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    const { password, refreshToken, ...result } = user;
    return { user: result, ...tokens };
  }

  /** تسجيل دخول / تسجيل عبر Google — يتحقق من Firebase ثم يحفظ في PostgreSQL */
  async loginWithGoogle(dto: GoogleLoginDto) {
    if (!this.firebaseService.isReady) {
      throw new ServiceUnavailableException(
        'تسجيل Google غير مفعّل على السيرفر — أضف مفاتيح Firebase في .env',
      );
    }

    let googleUser;
    try {
      googleUser = await this.firebaseService.verifyIdToken(dto.idToken);
    } catch {
      throw new UnauthorizedException('رمز Google غير صالح أو منتهي');
    }

    let user = await this.usersService.findByFirebaseUid(googleUser.uid);

    if (!user) {
      const byEmail = await this.usersService.findByEmail(googleUser.email);
      if (byEmail) {
        byEmail.firebaseUid = googleUser.uid;
        byEmail.authProvider = 'google';
        if (!byEmail.avatarUrl && googleUser.avatarUrl) {
          byEmail.avatarUrl = googleUser.avatarUrl;
        }
        if (!byEmail.isVerified && googleUser.emailVerified) {
          byEmail.isVerified = true;
        }
        user = await this.usersService.save(byEmail);
      }
    }

    if (!user) {
      return {
        needsRegistration: true,
        profile: {
          email: googleUser.email,
          fullName: googleUser.fullName,
          avatarUrl: googleUser.avatarUrl ?? null,
        },
      };
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('تم تعليق حسابك - تواصل مع الدعم');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    const { password, refreshToken, ...result } = user;
    return { user: result, ...tokens, isNewUser: false };
  }

  /** إكمال تسجيل حساب Google جديد — اختيار بائع/مشتري + بيانات إضافية */
  async completeGoogleRegistration(dto: GoogleCompleteRegisterDto) {
    if (!this.firebaseService.isReady) {
      throw new ServiceUnavailableException(
        'تسجيل Google غير مفعّل على السيرفر — أضف مفاتيح Firebase في .env',
      );
    }

    let googleUser;
    try {
      googleUser = await this.firebaseService.verifyIdToken(dto.idToken);
    } catch {
      throw new UnauthorizedException('رمز Google غير صالح أو منتهي');
    }

    const existingUid = await this.usersService.findByFirebaseUid(googleUser.uid);
    if (existingUid) {
      throw new ConflictException('الحساب مسجل مسبقاً — سجّل الدخول بجوجل');
    }

    const existingEmail = await this.usersService.findByEmail(googleUser.email);
    if (existingEmail) {
      throw new ConflictException('البريد مسجل مسبقاً — استخدم تسجيل الدخول بالبريد أو جوجل');
    }

    if (dto.phone) {
      const existingPhone = await this.usersService.findByPhone(dto.phone);
      if (existingPhone) {
        throw new ConflictException('رقم الجوال مسجل مسبقاً');
      }
    }

    const safeRole =
      dto.role === UserRole.SELLER ? UserRole.SELLER : UserRole.BUYER;
    const randomPassword = await bcrypt.hash(randomBytes(32).toString('hex'), 12);

    const user = await this.usersService.create({
      email: googleUser.email,
      fullName: dto.fullName?.trim() || googleUser.fullName,
      phone: dto.phone,
      city: dto.city,
      avatarUrl: googleUser.avatarUrl,
      firebaseUid: googleUser.uid,
      authProvider: 'google',
      password: randomPassword,
      role: safeRole,
      status: UserStatus.ACTIVE,
      isVerified: googleUser.emailVerified,
    });
    await this.walletsService.createWallet(user.id);

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    const { password, refreshToken, ...result } = user;
    return { user: result, ...tokens, isNewUser: true };
  }

  async refreshTokens(refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token مطلوب');
    }

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.secret'),
      });
      const user = await this.usersService.findById(payload.sub);
      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Refresh token غير صالح');
      }
      const tokens = await this.generateTokens(user.id, user.email, user.role);
      await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);
      return tokens;
    } catch {
      throw new UnauthorizedException('Refresh token منتهي أو غير صالح');
    }
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const expiresIn = this.configService.get<string>('jwt.expiresIn') ?? '7d';
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: expiresIn as `${number}d`,
      }),
      this.jwtService.signAsync(payload, { expiresIn: '30d' }),
    ]);
    return { accessToken, refreshToken };
  }
}
