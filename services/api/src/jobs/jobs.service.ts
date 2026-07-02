import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MarketsService } from '../markets/markets.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JobsService {
  constructor(
    private markets: MarketsService,
    private leaderboard: LeaderboardService,
    private prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async closeMarkets() {
    await this.markets.closeExpiredMarkets();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async snapshotLeaderboard() {
    await this.leaderboard.recomputeAll();
  }

  @Cron('*/5 * * * *')
  async expireQuotes() {
    const cutoff = new Date(Date.now() - 3600000);
    await this.prisma.quote.deleteMany({
      where: { expiresAt: { lt: cutoff }, consumedAt: null },
    });
  }
}
