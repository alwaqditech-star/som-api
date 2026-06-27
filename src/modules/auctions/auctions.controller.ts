import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuctionsService } from './auctions.service';
import { AuctionGateway } from './gateways/auction.gateway';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public, Roles } from '../../common/decorators';
import { UserRole, AuctionStatus } from '../../common/enums';
import { CreateAuctionDto, UpdateAuctionDto, AuctionQueryDto, SetFeaturedDto } from './dto/auction.dto';

@ApiTags('auctions')
@Controller('auctions')
export class AuctionsController {
  constructor(
    private auctionsService: AuctionsService,
    @Inject(forwardRef(() => AuctionGateway))
    private auctionGateway: AuctionGateway,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'قائمة المزادات' })
  findAll(@Query() query: AuctionQueryDto) {
    return this.auctionsService.findAll(query);
  }

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'المزادات المباشرة الآن' })
  async findLive() {
    const auctions = await this.auctionsService.findLive();
    await Promise.all(
      auctions.map(async (auction) => {
        auction.viewersCount = await this.auctionGateway.refreshViewers(auction.id);
      }),
    );
    return auctions;
  }

  @ApiBearerAuth()
  @Get('watchlist/my')
  @ApiOperation({ summary: 'مزاداتي المفضلة' })
  myWatchlist(@CurrentUser('id') userId: string) {
    return this.auctionsService.getWatchlist(userId);
  }

  @ApiBearerAuth()
  @Get('wins/my')
  @ApiOperation({ summary: 'المزادات التي فزت بها (مشترياتي)' })
  myWins(@CurrentUser('id') userId: string) {
    return this.auctionsService.getMyWonAuctions(userId);
  }

  @ApiBearerAuth()
  @Get(':id/participant/me')
  @ApiOperation({ summary: 'هل انضممت للمزاد؟' })
  myParticipation(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.auctionsService.isParticipant(id, userId).then((joined) => ({ joined }));
  }

  @ApiBearerAuth()
  @Get(':id/contact')
  @ApiOperation({ summary: 'بيانات التواصل بعد البيع (فائز ↔ بائع)' })
  getContact(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.auctionsService.getContactInfo(id, userId, role);
  }

  @ApiBearerAuth()
  @Post(':id/interest-reminder/schedule')
  @ApiOperation({ summary: 'جدولة «هل ما زلت مهتماً؟» بعد مغادرة بدون مزايدة' })
  scheduleInterestReminder(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body?: { delaySeconds?: number },
  ) {
    return this.auctionsService.scheduleInterestReminder(
      id,
      userId,
      body?.delaySeconds,
    );
  }

  @ApiBearerAuth()
  @Post(':id/interest-reminder/cancel')
  @ApiOperation({ summary: 'إلغاء تذكير الاهتمام بالمزاد' })
  cancelInterestReminder(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.auctionsService.cancelInterestReminder(id, userId);
  }

  @ApiBearerAuth()
  @Post(':id/interest-reminder')
  @ApiOperation({ summary: 'إشعار «هل ما زلت مهتماً؟» بعد مشاهدة بدون مزايدة' })
  sendInterestReminder(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.auctionsService.sendInterestReminder(id, userId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل مزاد' })
  async findOne(@Param('id') id: string) {
    const auction = await this.auctionsService.findOne(id);
    if (auction.status === AuctionStatus.LIVE) {
      auction.viewersCount = await this.auctionGateway.refreshViewers(id);
    }
    return auction;
  }

  @ApiBearerAuth()
  @Post('seller/create')
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiOperation({ summary: 'البائع: إنشاء مزاد لسيارته المعتمدة' })
  createAsSeller(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAuctionDto,
  ) {
    return this.auctionsService.create(dto, userId);
  }

  @ApiBearerAuth()
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'إنشاء مزاد (إدارة)' })
  create(@Body() dto: CreateAuctionDto) {
    return this.auctionsService.create(dto);
  }

  @ApiBearerAuth()
  @Patch(':id/featured')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'تمييز/إلغاء تمييز مزاد للرئيسية' })
  setFeatured(@Param('id') id: string, @Body() dto: SetFeaturedDto) {
    return this.auctionsService.setFeatured(id, dto.isFeatured);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'تعديل مزاد' })
  update(@Param('id') id: string, @Body() dto: UpdateAuctionDto) {
    return this.auctionsService.update(id, dto);
  }

  @ApiBearerAuth()
  @Post(':id/start')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'بدء المزاد' })
  start(@Param('id') id: string) {
    return this.auctionsService.startAuction(id);
  }

  @ApiBearerAuth()
  @Post(':id/end')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'إنهاء المزاد' })
  end(@Param('id') id: string) {
    return this.auctionsService.endAuction(id);
  }

  @Public()
  @Post(':id/sync-viewers')
  @ApiOperation({ summary: 'مزامنة عداد المشاهدين من غرفة Socket' })
  async syncViewers(@Param('id') id: string) {
    const viewersCount = await this.auctionGateway.refreshViewers(id);
    return { viewersCount };
  }

  @ApiBearerAuth()
  @Post(':id/join')
  @ApiOperation({ summary: 'الانضمام للمزاد (دفع الوديعة)' })
  join(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.auctionsService.joinAuction(id, userId);
  }

  @ApiBearerAuth()
  @Post(':id/watchlist')
  @ApiOperation({ summary: 'إضافة للمفضلة' })
  addWatchlist(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.auctionsService.addToWatchlist(userId, id);
  }

  @ApiBearerAuth()
  @Delete(':id/watchlist')
  @ApiOperation({ summary: 'إزالة من المفضلة' })
  removeWatchlist(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.auctionsService.removeFromWatchlist(userId, id);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'حذف مزاد' })
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.auctionsService.remove(id, userId, role);
  }

}
