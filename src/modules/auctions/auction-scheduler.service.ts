import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';

import { Cron, CronExpression } from '@nestjs/schedule';

import { AuctionsService } from './auctions.service';

import { AuctionGateway } from './gateways/auction.gateway';



@Injectable()

export class AuctionSchedulerService {

  private readonly logger = new Logger(AuctionSchedulerService.name);



  constructor(

    private auctionsService: AuctionsService,

    @Inject(forwardRef(() => AuctionGateway))

    private auctionGateway: AuctionGateway,

  ) {}



  @Cron(CronExpression.EVERY_MINUTE)

  async handleAuctionLifecycle() {

    try {

      await this.auctionsService.processScheduledAuctions();

    } catch (error) {

      this.logger.error('Auction scheduler error', error);

    }

  }



  /** تصحيح عداد المشاهدين من غرف Socket (يتعامل مع التطبيقات المغلقة فجأة) */

  @Cron(CronExpression.EVERY_30_SECONDS)

  async syncLiveViewerCounts() {

    try {

      await this.auctionGateway.refreshAllLiveViewers();

    } catch (error) {

      this.logger.warn('Live viewers sync failed', error);

    }

  }

}


