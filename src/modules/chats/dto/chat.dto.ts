import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'مرحباً، متى نرتب المعاينة؟' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}
