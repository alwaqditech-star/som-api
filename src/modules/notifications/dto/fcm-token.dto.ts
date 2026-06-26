import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RegisterFcmTokenDto {
  @ApiProperty({ description: 'FCM device token من التطبيق' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
