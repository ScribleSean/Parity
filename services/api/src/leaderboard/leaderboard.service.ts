import { Injectable } from '@nestjs/common';
import { LEADERBOARD_MIN_SETTLED_MARKETS } from '@parity/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  async getLeaderboard(period: 'weekly' | 'alltime', currentUserId?: string) {
    const cached = await this.prisma.leaderboardCache.findUnique({
      where: { period },
    });
    if (cached) {
      const data = cached.dataJson as {
        entries: Array<Record<string, unknown>>;
      };
      return this.withPinnedUser(data.entries, currentUserId);
    }

    const entries = await this.computeLeaderboard(period);
    await this.prisma.leaderboardCache.upsert({
      where: { period },
      create: { period, dataJson: { entries } },
      update: { dataJson: { entries } },
    });
    return this.withPinnedUser(entries, currentUserId);
  }

  async recomputeAll() {
    for (const period of ['weekly', 'alltime'] as const) {
      const entries = await this.computeLeaderboard(period);
      await this.prisma.leaderboardCache.upsert({
        where: { period },
        create: { period, dataJson: { entries } },
        update: { dataJson: { entries } },
      });
    }
  }

  private async computeLeaderboard(period: 'weekly' | 'alltime') {
    const users = await this.prisma.user.findMany({
      include: {
        wallet: true,
        trades: period === 'weekly' ? { where: { createdAt: { gte: this.weekStart() } } } : true,
      },
    });

    const stats = await Promise.all(
      users.map(async (user) => {
        const pnl = await this.computeUserPnl(user.id, period);
        const settledMarkets = await this.countSettledMarkets(user.id, period);
        const winRate = await this.computeWinRate(user.id, period);
        return {
          userId: user.id,
          username: user.username,
          pnl,
          settledMarkets,
          winRate,
        };
      }),
    );

    return stats
      .filter((s) => s.settledMarkets >= LEADERBOARD_MIN_SETTLED_MARKETS)
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 100)
      .map((s, i) => ({
        rank: i + 1,
        userId: s.userId,
        username: s.username,
        pnl: Math.round(s.pnl * 100) / 100,
        winRate: Math.round(s.winRate * 1000) / 10,
        settledMarkets: s.settledMarkets,
      }));
  }

  private async computeUserPnl(userId: string, period: 'weekly' | 'alltime') {
    const since = period === 'weekly' ? this.weekStart() : undefined;
    const ledger = await this.prisma.ledgerEntry.findMany({
      where: {
        userId,
        ...(since ? { createdAt: { gte: since } } : {}),
        type: {
          in: [
            'TRADE_BUY',
            'TRADE_SELL',
            'SETTLEMENT_WIN',
            'ADMIN_ADJUSTMENT',
          ],
        },
      },
    });
    return ledger.reduce((sum, e) => sum + e.amount.toNumber(), 0);
  }

  private async countSettledMarkets(userId: string, period: 'weekly' | 'alltime') {
    const since = period === 'weekly' ? this.weekStart() : undefined;
    const trades = await this.prisma.trade.findMany({
      where: {
        userId,
        ...(since ? { createdAt: { gte: since } } : {}),
        market: { status: { in: ['RESOLVED', 'VOID'] } },
      },
      select: { marketId: true },
      distinct: ['marketId'],
    });
    return trades.length;
  }

  private async computeWinRate(userId: string, period: 'weekly' | 'alltime') {
    const since = period === 'weekly' ? this.weekStart() : undefined;
    const settlements = await this.prisma.ledgerEntry.findMany({
      where: {
        userId,
        type: 'SETTLEMENT_WIN',
        ...(since ? { createdAt: { gte: since } } : {}),
      },
    });
    const marketIds = new Set(settlements.map((s) => s.referenceId).filter(Boolean));
    if (marketIds.size === 0) return 0;

    let wins = 0;
    for (const marketId of marketIds) {
      const win = await this.prisma.ledgerEntry.findFirst({
        where: { userId, referenceId: marketId!, type: 'SETTLEMENT_WIN' },
      });
      const buys = await this.prisma.ledgerEntry.findMany({
        where: {
          userId,
          referenceType: 'trade',
          type: 'TRADE_BUY',
          createdAt: since ? { gte: since } : undefined,
        },
      });
      const buyTotal = buys.reduce((s, b) => s + Math.abs(b.amount.toNumber()), 0);
      const payout = win?.amount.toNumber() ?? 0;
      if (payout > buyTotal * 0.1) wins += 1;
    }

    const totalSettled = await this.countSettledMarkets(userId, period);
    return totalSettled > 0 ? wins / totalSettled : 0;
  }

  private weekStart() {
    const now = new Date();
    const day = now.getUTCDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
    monday.setUTCHours(0, 0, 0, 0);
    return monday;
  }

  private withPinnedUser(
    entries: Array<Record<string, unknown>>,
    currentUserId?: string,
  ) {
    if (!currentUserId) return { entries, pinned: null };
    const inList = entries.find((e) => e.userId === currentUserId);
    if (inList) return { entries, pinned: null };
    return { entries, pinned: null };
  }
}
