import { IsEmail, IsString, MinLength, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums';

export class RegisterDto {
  @ApiProperty({ example: 'ahmed@example.com' })
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  email: string;

  @ApiProperty({ example: '0551234567' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8, { message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' })
  password: string;

  @ApiProperty({ example: 'أحمد محمد العلي' })
  @IsString()
  fullName: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiPropertyOptional({ enum: [UserRole.BUYER, UserRole.SELLER], default: UserRole.BUYER })
  @IsOptional()
  @IsIn([UserRole.BUYER, UserRole.SELLER])
  role?: UserRole;

  @ApiPropertyOptional({ example: 'الرياض' })
  @IsOptional()
  @IsString()
  city?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'ahmed@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class GoogleLoginDto {
  @ApiProperty({ description: 'Firebase ID Token من تطبيق Flutter بعد Google Sign-In' })
  @IsString()
  idToken: string;
}

export class GoogleCompleteRegisterDto {
  @ApiProperty()
  @IsString()
  idToken: string;

  @ApiProperty({ enum: [UserRole.BUYER, UserRole.SELLER], default: UserRole.BUYER })
  @IsIn([UserRole.BUYER, UserRole.SELLER])
  role: UserRole;

  @ApiProperty({ example: '0551234567' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'أحمد محمد' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'الرياض' })
  @IsOptional()
  @IsString()
  city?: string;
}
