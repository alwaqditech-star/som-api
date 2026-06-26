import { IsNumber, Min, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DepositDto {
  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiPropertyOptional({ example: 'إيداع للمشاركة في المزادات' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class WithdrawDto {
  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(100)
  amount: number;
}
