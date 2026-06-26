import { IsNumber, Min, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlaceBidDto {
  @ApiProperty({ example: 55000 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAutoBid?: boolean;

  @ApiPropertyOptional({ example: 70000 })
  @IsOptional()
  @IsNumber()
  maxAutoBid?: number;
}
