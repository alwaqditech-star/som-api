import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatsService } from './chats.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SendMessageDto } from './dto/chat.dto';

@ApiTags('chats')
@ApiBearerAuth()
@Controller('chats')
export class ChatsController {
  constructor(private chatsService: ChatsService) {}

  @Get()
  @ApiOperation({ summary: 'محادثاتي (بعد البيع)' })
  list(@CurrentUser('id') userId: string) {
    return this.chatsService.listConversations(userId);
  }

  @Get('auction/:auctionId')
  @ApiOperation({ summary: 'فتح محادثة مزاد مباع' })
  byAuction(@Param('auctionId') auctionId: string, @CurrentUser('id') userId: string) {
    return this.chatsService.getOrCreateByAuction(auctionId, userId);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'رسائل المحادثة' })
  messages(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.chatsService.getMessages(id, userId, page ?? 1, limit ?? 50);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'إرسال رسالة' })
  send(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatsService.sendMessage(id, userId, dto);
  }
}
