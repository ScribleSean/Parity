import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MarketStatus, Prisma } from '@prisma/client';
import {
  MAX_TRADE_NOTIONAL,
  MIN_TRADE_NOTIONAL,
  QUOTE_TTL_MS,
  SETTLEMENT_PAYOUT_PER_CONTRACT,
  anonymizeUsername,
  getPrices,
  quoteBuy,
  quoteSell,
} from '@parity/shared';
import { PrismaService } from '../prisma/prisma.service';
import { DecimalUtil } from '../common/utils';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class TradingService {
  private locks = new Set<string>();

  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeService,
  ) {}

  async createQuote(
    userId: string,
    slug: string,
    input: { side: 'BUY' | 'SELL'; outcome: 'YES' | 'NO'; quantity: number },
  ) {
    const market = await this.getOpenMarket(slug);
    const quantity = input.quantity;
    if (quantity <= 0) throw new BadRequestException('Invalid quantity');

    const state = this.marketState(market);
    const quoteResult =
      input.side === 'BUY'
        ? quoteBuy(state, input.outcome, quantity)
        : quoteSell(state, input.outcome, quantity);

    const cost = quoteResult.costNotional;
    if (input.side === 'BUY') {
      if (cost < MIN_TRADE_NOTIONAL) {
        throw new BadRequestException(`Minimum trade is ${MIN_TRADE_NOTIONAL} N`);
      }
      if (cost > MAX_TRADE_NOTIONAL) {
        throw new BadRequestException(`Maximum trade is ${MAX_TRADE_NOTIONAL} N`);
      }
    }

    if (input.side === 'SELL') {
      const position = await this.prisma.position.findUnique({
        where: {
          userId_marketId_outcome: {
            userId,
            marketId: market.id,
            outcome: input.outcome,
          },
        },
      });
      const held = position?.quantity.toNumber() ?? 0;
      if (held < quantity) {
        throw new BadRequestException('Insufficient contracts to sell');
      }
    }

    const expiresAt = new Date(Date.now() + QUOTE_TTL_MS);
    const quote = await this.prisma.quote.create({
      data: {
        marketId: market.id,
        userId,
        side: input.side,
        outcome: input.outcome,
        quantity,
        costNotional: cost,
        avgPriceCents: quoteResult.avgPriceCents,
        expiresAt,
      },
    });

    const prices = getPrices(state);
    return {
      quoteId: quote.id,
      side: input.side,
      outcome: input.outcome,
      quantity,
      avgPriceCents: quoteResult.avgPriceCents,
      totalCostNotional: Math.round(cost),
      priceImpactCents: quoteResult.priceImpactCents,
      currentYesPriceCents: prices.yesCents,
      currentNoPriceCents: prices.noCents,
      newYesPriceCents: quoteResult.newPrices.yesCents,
      newNoPriceCents: quoteResult.newPrices.noCents,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async executeTrade(userId: string, slug: string, quoteId: string) {
    if (this.locks.has(userId)) {
      throw new BadRequestException('Another trade in progress');
    }
    this.locks.add(userId);
    try {
      return await this.executeTradeInternal(userId, slug, quoteId);
    } finally {
      this.locks.delete(userId);
    }
  }

  private async executeTradeInternal(
    userId: string,
    slug: string,
    quoteId: string,
  ) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: { market: true },
    });
    if (!quote || quote.userId !== userId) {
      throw new NotFoundException('Quote not found');
    }
    if (quote.consumedAt) throw new BadRequestException('Quote already used');
    if (quote.expiresAt < new Date()) throw new BadRequestException('Quote expired');
    if (quote.market.slug !== slug) throw new BadRequestException('Market mismatch');

    const market = await this.getOpenMarket(slug);
    const state = this.marketState(market);
    const quantity = DecimalUtil.toNumber(quote.quantity);
    const quoteResult =
      quote.side === 'BUY'
        ? quoteBuy(state, quote.outcome, quantity)
        : quoteSell(state, quote.outcome, quantity);

    const cost = quoteResult.costNotional;
    if (quote.side === 'BUY' && cost > MAX_TRADE_NOTIONAL) {
      throw new BadRequestException('Trade exceeds maximum');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Wallet not found');

      const balance = wallet.balanceNotional.toNumber();
      if (quote.side === 'BUY' && balance < cost) {
        throw new BadRequestException('Insufficient Notional');
      }

      if (quote.side === 'SELL') {
        const position = await tx.position.findUnique({
          where: {
            userId_marketId_outcome: {
              userId,
              marketId: market.id,
              outcome: quote.outcome,
            },
          },
        });
        if (!position || position.quantity.toNumber() < quantity) {
          throw new BadRequestException('Insufficient contracts');
        }
      }

      const newBalance =
        quote.side === 'BUY' ? balance - cost : balance + cost;

      await tx.wallet.update({
        where: { userId },
        data: { balanceNotional: newBalance },
      });

      await tx.ledgerEntry.create({
        data: {
          userId,
          type: quote.side === 'BUY' ? 'TRADE_BUY' : 'TRADE_SELL',
          amount: quote.side === 'BUY' ? -cost : cost,
          balanceAfter: newBalance,
          referenceType: 'trade',
          referenceId: quote.id,
        },
      });

      await tx.market.update({
        where: { id: market.id },
        data: {
          qYes: quoteResult.newState.qYes,
          qNo: quoteResult.newState.qNo,
          volumeNotional: { increment: cost },
        },
      });

      await tx.trade.create({
        data: {
          marketId: market.id,
          userId,
          side: quote.side,
          outcome: quote.outcome,
          quantity,
          priceCents: quote.avgPriceCents,
          costNotional: cost,
        },
      });

      await this.updatePosition(tx, userId, market.id, quote.outcome, quote.side, quantity, quote.avgPriceCents.toNumber(), cost);

      await tx.quote.update({
        where: { id: quoteId },
        data: { consumedAt: new Date() },
      });

      await tx.marketOddsSnapshot.create({
        data: {
          marketId: market.id,
          yesCents: quoteResult.newPrices.yesCents,
          noCents: quoteResult.newPrices.noCents,
          volume: cost,
        },
      });

      return {
        newBalance,
        prices: quoteResult.newPrices,
        volume: DecimalUtil.toNumber(market.volumeNotional) + cost,
      };
    });

    this.realtime.emitMarketOdds({
      slug,
      yesCents: result.prices.yesCents,
      noCents: result.prices.noCents,
      volume: result.volume,
      qYes: quoteResult.newState.qYes,
      qNo: quoteResult.newState.qNo,
      b: state.b,
      ts: new Date().toISOString(),
    });
    this.realtime.emitMarketTrade({
      slug,
      outcome: quote.outcome,
      side: quote.side,
      quantity,
      priceCents: quote.avgPriceCents.toNumber(),
      ts: new Date().toISOString(),
    });
    this.realtime.emitUserWallet(userId, result.newBalance);

    return { ok: true, balance: result.newBalance, prices: result.prices };
  }

  private async updatePosition(
    tx: Prisma.TransactionClient,
    userId: string,
    marketId: string,
    outcome: 'YES' | 'NO',
    side: 'BUY' | 'SELL',
    quantity: number,
    avgPriceCents: number,
    cost: number,
  ) {
    const existing = await tx.position.findUnique({
      where: { userId_marketId_outcome: { userId, marketId, outcome } },
    });

    if (side === 'BUY') {
      if (!existing) {
        await tx.position.create({
          data: {
            userId,
            marketId,
            outcome,
            quantity,
            avgEntryCents: avgPriceCents,
            costBasisNotional: cost,
          },
        });
        return;
      }
      const oldQty = existing.quantity.toNumber();
      const newQty = oldQty + quantity;
      const oldCost = existing.costBasisNotional.toNumber();
      const newCost = oldCost + cost;
      const newAvg =
        newQty > 0
          ? ((existing.avgEntryCents.toNumber() * oldQty + avgPriceCents * quantity) /
              newQty)
          : 0;
      await tx.position.update({
        where: { id: existing.id },
        data: {
          quantity: newQty,
          avgEntryCents: Math.round(newAvg * 10) / 10,
          costBasisNotional: newCost,
        },
      });
      return;
    }

    if (!existing) throw new BadRequestException('No position');
    const oldQty = existing.quantity.toNumber();
    const newQty = oldQty - quantity;
    const oldCost = existing.costBasisNotional.toNumber();
    const costReduction = (oldCost / oldQty) * quantity;
    const newCost = oldCost - costReduction;

    if (newQty <= 0.000001) {
      await tx.position.delete({ where: { id: existing.id } });
    } else {
      await tx.position.update({
        where: { id: existing.id },
        data: { quantity: newQty, costBasisNotional: Math.max(0, newCost) },
      });
    }
  }

  async getPositions(userId: string) {
    const positions = await this.prisma.position.findMany({
      where: { userId, market: { status: { in: ['OPEN', 'CLOSED'] } } },
      include: { market: true },
    });
    return positions.map((p) => {
      const state = this.marketState(p.market);
      const prices = getPrices(state);
      const current =
        p.outcome === 'YES' ? prices.yesCents : prices.noCents;
      const qty = p.quantity.toNumber();
      const unrealized = (current / 100) * qty * SETTLEMENT_PAYOUT_PER_CONTRACT - p.costBasisNotional.toNumber();
      return {
        marketId: p.marketId,
        slug: p.market.slug,
        title: p.market.title,
        status: p.market.status,
        outcome: p.outcome,
        quantity: qty,
        avgEntryCents: p.avgEntryCents.toNumber(),
        currentPriceCents: current,
        costBasisNotional: p.costBasisNotional.toNumber(),
        unrealizedPnl: Math.round(unrealized * 100) / 100,
      };
    });
  }

  async getPositionHistory(userId: string) {
    const settled = await this.prisma.position.findMany({
      where: {
        userId,
        market: { status: { in: ['RESOLVED', 'VOID'] } },
      },
      include: { market: true },
    });
    return settled.map((p) => ({
      marketId: p.marketId,
      slug: p.market.slug,
      title: p.market.title,
      resolution: p.market.resolution,
      outcome: p.outcome,
      quantity: p.quantity.toNumber(),
      costBasisNotional: p.costBasisNotional.toNumber(),
      resolvedAt: p.market.resolvedAt,
    }));
  }

  async getRecentTrades(slug: string, page = 1, limit = 20) {
    const market = await this.prisma.market.findUnique({ where: { slug } });
    if (!market) throw new NotFoundException();
    const skip = (page - 1) * limit;
    const trades = await this.prisma.trade.findMany({
      where: { marketId: market.id },
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });
    return trades.map((t) => ({
      outcome: t.outcome,
      side: t.side,
      quantity: t.quantity.toNumber(),
      priceCents: t.priceCents.toNumber(),
      username: anonymizeUsername(t.user.username),
      createdAt: t.createdAt,
    }));
  }

  private async getOpenMarket(slug: string) {
    const market = await this.prisma.market.findUnique({ where: { slug } });
    if (!market) throw new NotFoundException('Market not found');
    if (market.status !== MarketStatus.OPEN) {
      throw new BadRequestException('Market is not open for trading');
    }
    if (market.closesAt <= new Date()) {
      throw new BadRequestException('Market has closed');
    }
    return market;
  }

  private marketState(market: {
    qYes: Prisma.Decimal;
    qNo: Prisma.Decimal;
    liquidityParam: Prisma.Decimal;
  }) {
    return {
      qYes: DecimalUtil.toNumber(market.qYes),
      qNo: DecimalUtil.toNumber(market.qNo),
      b: DecimalUtil.toNumber(market.liquidityParam),
    };
  }
}

@Injectable()
export class SettlementService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeService,
  ) {}

  async resolveMarket(
    adminId: string,
    marketId: string,
    resolution: 'YES' | 'NO' | 'VOID',
    note?: string,
  ) {
    const market = await this.prisma.market.findUnique({ where: { id: marketId } });
    if (!market) throw new NotFoundException();
    if (!['CLOSED', 'OPEN'].includes(market.status)) {
      throw new BadRequestException('Market cannot be resolved');
    }

    if (resolution === 'VOID') {
      return this.voidMarket(adminId, market);
    }

    await this.prisma.$transaction(async (tx) => {
      const positions = await tx.position.findMany({ where: { marketId } });
      for (const pos of positions) {
        const qty = pos.quantity.toNumber();
        const won =
          (resolution === 'YES' && pos.outcome === 'YES') ||
          (resolution === 'NO' && pos.outcome === 'NO');
        const payout = won ? qty * SETTLEMENT_PAYOUT_PER_CONTRACT : 0;
        if (payout > 0) {
          const wallet = await tx.wallet.findUnique({ where: { userId: pos.userId } });
          const balance = wallet!.balanceNotional.toNumber() + payout;
          await tx.wallet.update({
            where: { userId: pos.userId },
            data: { balanceNotional: balance },
          });
          await tx.ledgerEntry.create({
            data: {
              userId: pos.userId,
              type: 'SETTLEMENT_WIN',
              amount: payout,
              balanceAfter: balance,
              referenceType: 'market',
              referenceId: marketId,
            },
          });
          this.realtime.emitUserWallet(pos.userId, balance);
        }
        await tx.position.delete({ where: { id: pos.id } });
      }

      await tx.market.update({
        where: { id: marketId },
        data: {
          status: 'RESOLVED',
          resolution,
          resolutionNote: note,
          resolvedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          adminId,
          action: 'RESOLVE',
          entityType: 'market',
          entityId: marketId,
          payloadJson: { resolution, note },
        },
      });
    });

    this.realtime.emitMarketStatus({
      slug: market.slug,
      status: 'RESOLVED',
      resolution,
    });
    this.realtime.emitLeaderboardUpdated('alltime');
    this.realtime.emitLeaderboardUpdated('weekly');

    return { ok: true };
  }

  private async voidMarket(
    adminId: string,
    market: { id: string; slug: string },
  ) {
    await this.prisma.$transaction(async (tx) => {
      const positions = await tx.position.findMany({ where: { marketId: market.id } });
      for (const pos of positions) {
        const refund = Math.max(0, pos.costBasisNotional.toNumber());
        if (refund > 0) {
          const wallet = await tx.wallet.findUnique({ where: { userId: pos.userId } });
          const balance = wallet!.balanceNotional.toNumber() + refund;
          await tx.wallet.update({
            where: { userId: pos.userId },
            data: { balanceNotional: balance },
          });
          await tx.ledgerEntry.create({
            data: {
              userId: pos.userId,
              type: 'ADMIN_ADJUSTMENT',
              amount: refund,
              balanceAfter: balance,
              referenceType: 'market_void',
              referenceId: market.id,
              metadataJson: { reason: 'MARKET_VOID' },
            },
          });
        }
        await tx.position.delete({ where: { id: pos.id } });
      }
      await tx.market.update({
        where: { id: market.id },
        data: {
          status: 'VOID',
          resolution: 'VOID',
          resolvedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          adminId,
          action: 'VOID',
          entityType: 'market',
          entityId: market.id,
        },
      });
    });

    this.realtime.emitMarketStatus({ slug: market.slug, status: 'VOID', resolution: 'VOID' });
    return { ok: true };
  }
}
