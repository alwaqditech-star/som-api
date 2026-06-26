import { Controller, Get, Patch, Param, Query, Post, Body, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RegisterFcmTokenDto } from './dto/fcm-token.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Post('fcm-token')
  @ApiOperation({ summary: 'تسجيل توكن FCM للإشعارات الفورية' })
  registerFcmToken(
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterFcmTokenDto,
  ) {
    return this.notificationsService.registerFcmToken(userId, dto.token);
  }

  @Delete('fcm-token')
  @ApiOperation({ summary: 'إلغاء توكن FCM عند تسجيل الخروج' })
  clearFcmToken(@CurrentUser('id') userId: string) {
    return this.notificationsService.clearFcmToken(userId);
  }

  @Get()
  @ApiOperation({ summary: 'إشعاراتي' })
  getNotifications(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.notificationsService.getUserNotifications(userId, +page, +limit);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'عدد الإشعارات غير المقروءة' })
  unreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'تحديد كمقروء' })
  markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(userId, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'تحديد الكل كمقروء' })
  markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }
}
