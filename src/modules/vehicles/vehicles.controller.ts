import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public, Roles } from '../../common/decorators';
import { UserRole } from '../../common/enums';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  ReviewVehicleDto,
  VehicleQueryDto,
} from './dto/vehicle.dto';

@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private vehiclesService: VehiclesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'قائمة السيارات' })
  findAll(@Query() query: VehicleQueryDto) {
    return this.vehiclesService.findAll(query);
  }

  @ApiBearerAuth()
  @Get('admin/pending')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'سيارات بانتظار المراجعة (إدارة)' })
  pendingReview() {
    return this.vehiclesService.findPendingReview();
  }

  @ApiBearerAuth()
  @Get('seller/my')
  @ApiOperation({ summary: 'سياراتي' })
  myVehicles(@CurrentUser('id') userId: string) {
    return this.vehiclesService.findBySeller(userId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل سيارة' })
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  @ApiBearerAuth()
  @Post()
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiOperation({ summary: 'إضافة سيارة للبيع' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(userId, dto);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'تعديل سيارة' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(id, userId, dto);
  }

  @ApiBearerAuth()
  @Patch(':id/review')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'مراجعة سيارة (إدارة)' })
  review(@Param('id') id: string, @Body() dto: ReviewVehicleDto) {
    return this.vehiclesService.review(id, dto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'حذف سيارة وبياناتها' })
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.vehiclesService.remove(id, userId, role);
  }
}
