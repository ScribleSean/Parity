import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MarketStatus } from '@prisma/client';
import { getPrices } from '@parity/shared';
import { PrismaService } from '../prisma/prisma.service';
import { DecimalUtil, slugify } from '../common/utils';
import { RealtimeService } from '../realtime/realtime.service';
import { SettlementService } from '../trading/trading.service';

@Injectable()
export class MarketsService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeService,
    @Inject(SettlementService) private settlement: SettlementService,
  ) {}

  async list(query: {
    status?: MarketStatus;
    category?: string;
    q?: string;
    page?: number;
    limit?: number;
    includeDrafts?: boolean;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Record<string, unknown> = {};
    if (!query.includeDrafts) {
      where.status = query.status ?? { not: 'DRAFT' };
    } else if (query.status) {
      where.status = query.status;
    }
    if (query.category) where.category = query.category;
    if (query.q) {
      where.title = { contains: query.q, mode: 'insensitive' };
    }

    const [markets, total] = await Promise.all([
      this.prisma.market.findMany({
        where,
        orderBy: [{ status: 'asc' }, { closesAt: 'asc' }, { resolvedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.market.count({ where }),
    ]);

    return {
      items: markets.map((m) => this.serializeMarket(m)),
      page,
      limit,
      total,
    };
  }

  async getBySlug(slug: string) {
    const market = await this.prisma.market.findUnique({ where: { slug } });
    if (!market || market.status === 'DRAFT') {
      throw new NotFoundException('Market not found');
    }
    return this.serializeMarket(market, true);
  }

  async getHistory(slug: string) {
    const market = await this.prisma.market.findUnique({ where: { slug } });
    if (!market) throw new NotFoundException();
    const snapshots = await this.prisma.marketOddsSnapshot.findMany({
      where: { marketId: market.id },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });
    return snapshots.map((s) => ({
      ts: s.createdAt.toISOString(),
      yesCents: s.yesCents.toNumber(),
      noCents: s.noCents.toNumber(),
      volume: s.volume.toNumber(),
    }));
  }

  async create(adminId: string, input: {
    title: string;
    description: string;
    category: string;
    imageUrl?: string | null;
    opensAt: string;
    closesAt: string;
    liquidityParam?: number;
  }) {
    if (new Date(input.closesAt) <= new Date(input.opensAt)) {
      throw new BadRequestException('closesAt must be after opensAt');
    }
    let slug = slugify(input.title);
    const existing = await this.prisma.market.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const market = await this.prisma.market.create({
      data: {
        slug,
        title: input.title.endsWith('?') ? input.title : `${input.title}?`,
        description: input.description,
        category: input.category as never,
        imageUrl: input.imageUrl,
        opensAt: new Date(input.opensAt),
        closesAt: new Date(input.closesAt),
        liquidityParam: input.liquidityParam ?? 1000,
        createdById: adminId,
        status: 'DRAFT',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        adminId,
        action: 'CREATE',
        entityType: 'market',
        entityId: market.id,
      },
    });

    return market;
  }

  async update(marketId: string, adminId: string, input: Record<string, unknown>) {
    const market = await this.prisma.market.findUnique({ where: { id: marketId } });
    if (!market) throw new NotFoundException();
    if (market.status !== 'DRAFT') {
      throw new BadRequestException('Only draft markets can be edited');
    }
    const updated = await this.prisma.market.update({
      where: { id: marketId },
      data: {
        title: input.title as string | undefined,
        description: input.description as string | undefined,
        category: input.category as never,
        imageUrl: input.imageUrl as string | null | undefined,
        opensAt: input.opensAt ? new Date(input.opensAt as string) : undefined,
        closesAt: input.closesAt ? new Date(input.closesAt as string) : undefined,
        liquidityParam: input.liquidityParam as number | undefined,
      },
    });
    await this.prisma.auditLog.create({
      data: { adminId, action: 'UPDATE', entityType: 'market', entityId: marketId },
    });
    return updated;
  }

  async publish(marketId: string, adminId: string) {
    const market = await this.prisma.market.update({
      where: { id: marketId },
      data: { status: 'OPEN' },
    });
    await this.prisma.auditLog.create({
      data: { adminId, action: 'PUBLISH', entityType: 'market', entityId: marketId },
    });
    this.realtime.emitMarketStatus({ slug: market.slug, status: 'OPEN' });
    return market;
  }

  async close(marketId: string, adminId: string) {
    const market = await this.prisma.market.update({
      where: { id: marketId },
      data: { status: 'CLOSED' },
    });
    await this.prisma.auditLog.create({
      data: { adminId, action: 'CLOSE', entityType: 'market', entityId: marketId },
    });
    this.realtime.emitMarketStatus({ slug: market.slug, status: 'CLOSED' });
    return market;
  }

  async resolve(
    marketId: string,
    adminId: string,
    resolution: 'YES' | 'NO' | 'VOID',
    note?: string,
  ) {
    return this.settlement.resolveMarket(adminId, marketId, resolution, note);
  }

  async closeExpiredMarkets() {
    const now = new Date();
    const expired = await this.prisma.market.findMany({
      where: { status: 'OPEN', closesAt: { lte: now } },
    });
    for (const m of expired) {
      await this.prisma.market.update({
        where: { id: m.id },
        data: { status: 'CLOSED' },
      });
      this.realtime.emitMarketStatus({ slug: m.slug, status: 'CLOSED' });
    }
  }

  private serializeMarket(
    market: {
      id: string;
      slug: string;
      title: string;
      description: string;
      category: string;
      imageUrl: string | null;
      status: MarketStatus;
      opensAt: Date;
      closesAt: Date;
      resolvedAt: Date | null;
      resolution: string | null;
      resolutionNote: string | null;
      volumeNotional: { toNumber(): number };
      qYes: { toNumber(): number };
      qNo: { toNumber(): number };
      liquidityParam: { toNumber(): number };
    },
    detailed = false,
  ) {
    const state = {
      qYes: DecimalUtil.toNumber(market.qYes as never),
      qNo: DecimalUtil.toNumber(market.qNo as never),
      b: DecimalUtil.toNumber(market.liquidityParam as never),
    };
    const prices = getPrices(state);
    return {
      id: market.id,
      slug: market.slug,
      title: market.title,
      description: detailed ? market.description : undefined,
      category: market.category,
      imageUrl: market.imageUrl,
      status: market.status,
      opensAt: market.opensAt.toISOString(),
      closesAt: market.closesAt.toISOString(),
      resolvedAt: market.resolvedAt?.toISOString() ?? null,
      resolution: market.resolution,
      resolutionNote: detailed ? market.resolutionNote : undefined,
      volumeNotional: market.volumeNotional.toNumber(),
      yesCents: prices.yesCents,
      noCents: prices.noCents,
      yesPercent: Math.round(prices.yesPrice * 100),
      noPercent: Math.round(prices.noPrice * 100),
      ...(detailed
        ? { lmsrState: state }
        : {}),
    };
  }
}
