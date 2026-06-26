import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { AuctionType, AuctionStatus } from '../../../common/enums';

export class CreateAuctionDto {
  @ApiProperty()
  @IsString()
  vehicleId: string;

  @ApiProperty({ example: 'مزاد تويota كامري 2022' })
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: AuctionType, default: AuctionType.LIVE })
  @IsOptional()
  @IsEnum(AuctionType)
  type?: AuctionType;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(1000)
  startingPrice: number;

  @ApiPropertyOptional({ example: 75000 })
  @IsOptional()
  @IsNumber()
  reservePrice?: number;

  @ApiPropertyOptional({ example: 90000 })
  @IsOptional()
  @IsNumber()
  buyNowPrice?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  minBidIncrement?: number;

  @ApiPropertyOptional({ example: 2500 })
  @IsOptional()
  @IsNumber()
  depositAmount?: number;

  @ApiProperty({ example: '2026-06-25T18:00:00Z' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '2026-06-25T20:00:00Z' })
  @IsString()
  endTime: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

export class UpdateAuctionDto extends PartialType(CreateAuctionDto) {}

export class SetFeaturedDto {
  @ApiProperty()
  @IsBoolean()
  isFeatured: boolean;
}

export class AuctionQueryDto {
  @ApiPropertyOptional({ enum: AuctionStatus })
  @IsOptional()
  @IsEnum(AuctionStatus)
  status?: AuctionStatus;

  @ApiPropertyOptional({ enum: AuctionType })
  @IsOptional()
  @IsEnum(AuctionType)
  type?: AuctionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;
}
