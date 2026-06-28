import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from '../common/decorators';
import { ShareService } from './share.service';

@ApiTags('share')
@Controller()
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Public()
  @Get('share/auction/:id')
  @ApiOperation({ summary: 'صفحة مشاركة المزاد — تفتح التطبيق' })
  async auctionShare(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.shareService.sendAuctionPage(id, req, res);
  }

  @Public()
  @Get('.well-known/assetlinks.json')
  assetLinks(@Res() res: Response) {
    this.shareService.sendAssetLinks(res);
  }
}
