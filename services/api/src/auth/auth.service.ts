import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { createHash, randomBytes } from 'crypto';
import {
  REFILL_TARGET_NOTIONAL,
  REFILL_THRESHOLD_NOTIONAL,
  SIGNUP_BONUS_NOTIONAL,
  FREE_REFILLS_PER_MONTH,
  AD_REFILLS_PER_DAY,
  TOTAL_REFILLS_PER_DAY,
  dayKey,
  monthKey,
} from '@parity/shared';
import { PrismaService } from '../prisma/prisma.service';
import { generateUsername } from '../common/utils';
import { AuthUser } from '../common/auth.guard';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  getGoogleAuthUrl(): string {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      if (this.config.get('DEV_AUTH_ENABLED') === 'true') {
        return `${this.config.get('API_URL')}/api/v1/auth/dev/login`;
      }
      throw new BadRequestException('Google OAuth not configured');
    }
    const redirect = `${this.config.get('API_URL')}/api/v1/auth/callback/google`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirect,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  getAppleAuthUrl(): string {
    if (this.config.get('DEV_AUTH_ENABLED') === 'true') {
      return `${this.config.get('API_URL')}/api/v1/auth/dev/login?provider=apple`;
    }
    throw new BadRequestException('Apple OAuth not configured in dev');
  }

  async handleDevLogin(provider = 'google') {
    const id = randomBytes(8).toString('hex');
    return this.upsertOAuthUser({
      provider: provider === 'apple' ? 'apple' : 'dev',
      providerId: `dev-${id}`,
      email: `dev-${id}@parity.local`,
      name: `Dev Trader ${id.slice(0, 4)}`,
      avatarUrl: null,
    });
  }

  async handleOAuthCallback(
    provider: string,
    profile: {
      providerId: string;
      email: string;
      name: string;
      avatarUrl?: string | null;
    },
    res: Response,
  ) {
    const user = await this.upsertOAuthUser({
      provider,
      providerId: profile.providerId,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl ?? null,
    });
    await this.setAuthCookies(res, user.id, user.email, user.role);
    res.redirect(`${this.config.get('WEB_URL')}/auth/callback?ok=1`);
  }

  private async upsertOAuthUser(input: {
    provider: string;
    providerId: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  }) {
    let user = await this.prisma.user.findUnique({
      where: {
        oauthProvider_oauthProviderId: {
          oauthProvider: input.provider,
          oauthProviderId: input.providerId,
        },
      },
    });

    if (!user) {
      const byEmail = await this.prisma.user.findUnique({
        where: { email: input.email },
      });
      if (byEmail) user = byEmail;
    }

    if (!user) {
      let username = generateUsername(input.name);
      while (await this.prisma.user.findUnique({ where: { username } })) {
        username = generateUsername(input.name);
      }
      user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: input.email,
            username,
            displayName: input.name,
            avatarUrl: input.avatarUrl,
            oauthProvider: input.provider,
            oauthProviderId: input.providerId,
          },
        });
        await tx.wallet.create({
          data: { userId: created.id, balanceNotional: SIGNUP_BONUS_NOTIONAL },
        });
        await tx.ledgerEntry.create({
          data: {
            userId: created.id,
            type: 'SIGNUP_BONUS',
            amount: SIGNUP_BONUS_NOTIONAL,
            balanceAfter: SIGNUP_BONUS_NOTIONAL,
            referenceType: 'signup',
          },
        });
        return created;
      });
    }

    return user;
  }

  async setAuthCookies(res: Response, userId: string, email: string, role: string) {
    const accessToken = this.jwt.sign(
      { sub: userId, email, role },
      { expiresIn: this.config.get('JWT_ACCESS_EXPIRES') || '15m' },
    );
    const refreshRaw = randomBytes(48).toString('hex');
    const refreshHash = createHash('sha256').update(refreshRaw).digest('hex');
    const days = Number(this.config.get('JWT_REFRESH_EXPIRES_DAYS') || 30);
    const expiresAt = new Date(Date.now() + days * 86400000);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: refreshHash, expiresAt },
    });

    const isProd = this.config.get('NODE_ENV') === 'production';
    const webUrl = this.config.get<string>('WEB_URL') || '';
    const apiUrl = this.config.get<string>('API_URL') || '';
    let crossSite = false;
    try {
      if (isProd && webUrl && apiUrl) {
        crossSite = new URL(webUrl).host !== new URL(apiUrl).host;
      }
    } catch {
      crossSite = isProd;
    }
    const cookieOpts = {
      httpOnly: true,
      secure: isProd || crossSite,
      sameSite: (crossSite ? 'none' : 'lax') as 'none' | 'lax',
    };
    res.cookie('access_token', accessToken, {
      ...cookieOpts,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', refreshRaw, {
      ...cookieOpts,
      maxAge: days * 86400000,
      path: '/api/v1/auth/refresh',
    });
  }

  async refresh(refreshToken: string, res: Response) {
    const hash = createHash('sha256').update(refreshToken).digest('hex');
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: hash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    await this.setAuthCookies(
      res,
      stored.user.id,
      stored.user.email,
      stored.user.role,
    );
    return { ok: true };
  }

  async logout(refreshToken: string | undefined, res: Response) {
    if (refreshToken) {
      const hash = createHash('sha256').update(refreshToken).digest('hex');
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: hash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });
    return { ok: true };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });
    if (!user) throw new NotFoundException();
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      balance: user.wallet?.balanceNotional.toNumber() ?? 0,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(userId: string, data: {
    username?: string;
    displayName?: string;
    avatarUrl?: string | null;
  }) {
    if (data.username) {
      const existing = await this.prisma.user.findUnique({
        where: { username: data.username },
      });
      if (existing && existing.id !== userId) {
        throw new BadRequestException('Username taken');
      }
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        username: data.username,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
      },
    });
  }

  issueAccessToken(user: AuthUser) {
    return this.jwt.sign(user, {
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES') || '15m',
    });
  }
}

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    const balance = wallet.balanceNotional.toNumber();
    const eligibility = this.computeRefillEligibility(wallet, balance);
    return { balance, ...eligibility };
  }

  private computeRefillEligibility(
    wallet: {
      freeRefillsUsedMonth: number;
      adRefillsUsedToday: number;
      totalRefillsUsedToday: number;
      refillMonthKey: string | null;
      refillDayKey: string | null;
    },
    balance: number,
  ) {
    const currentMonth = monthKey();
    const currentDay = dayKey();
    const freeUsed =
      wallet.refillMonthKey === currentMonth ? wallet.freeRefillsUsedMonth : 0;
    const adUsed =
      wallet.refillDayKey === currentDay ? wallet.adRefillsUsedToday : 0;
    const totalUsed =
      wallet.refillDayKey === currentDay ? wallet.totalRefillsUsedToday : 0;

    const eligible = balance < REFILL_THRESHOLD_NOTIONAL;
    const freeRemaining = Math.max(0, FREE_REFILLS_PER_MONTH - freeUsed);
    const adRemaining = Math.max(0, AD_REFILLS_PER_DAY - adUsed);
    const dailyRemaining = Math.max(0, TOTAL_REFILLS_PER_DAY - totalUsed);

    return {
      eligible,
      freeRefillsRemaining: freeRemaining,
      adRefillsRemaining: adRemaining,
      dailyRefillsRemaining: dailyRemaining,
      canFreeRefill: eligible && freeRemaining > 0 && dailyRemaining > 0,
      canAdRefill: eligible && adRemaining > 0 && dailyRemaining > 0,
    };
  }

  async refillFree(userId: string) {
    return this.refill(userId, 'FREE');
  }

  async refillAd(_userId: string) {
    throw new BadRequestException('Ad refills available in Phase 2');
  }

  private async refill(userId: string, source: 'FREE' | 'AD' | 'PREMIUM') {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException();

    const balance = wallet.balanceNotional.toNumber();
    if (balance >= REFILL_THRESHOLD_NOTIONAL) {
      throw new BadRequestException('Balance above refill threshold');
    }

    const currentMonth = monthKey();
    const currentDay = dayKey();
    let freeUsed =
      wallet.refillMonthKey === currentMonth ? wallet.freeRefillsUsedMonth : 0;
    let adUsed =
      wallet.refillDayKey === currentDay ? wallet.adRefillsUsedToday : 0;
    let totalUsed =
      wallet.refillDayKey === currentDay ? wallet.totalRefillsUsedToday : 0;

    if (totalUsed >= TOTAL_REFILLS_PER_DAY) {
      throw new BadRequestException('Daily refill limit reached');
    }

    if (source === 'FREE') {
      if (freeUsed >= FREE_REFILLS_PER_MONTH) {
        throw new BadRequestException('Monthly free refill limit reached');
      }
      freeUsed += 1;
    }

    if (source === 'AD') {
      if (adUsed >= AD_REFILLS_PER_DAY) {
        throw new BadRequestException('Daily ad refill limit reached');
      }
      adUsed += 1;
    }

    totalUsed += 1;
    const newBalance = REFILL_TARGET_NOTIONAL;
    const ledgerType =
      source === 'FREE'
        ? 'REFILL_FREE'
        : source === 'AD'
          ? 'REFILL_AD'
          : 'REFILL_PREMIUM';

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { userId },
        data: {
          balanceNotional: newBalance,
          freeRefillsUsedMonth: freeUsed,
          adRefillsUsedToday: adUsed,
          totalRefillsUsedToday: totalUsed,
          refillMonthKey: currentMonth,
          refillDayKey: currentDay,
          lastRefillAt: new Date(),
        },
      }),
      this.prisma.ledgerEntry.create({
        data: {
          userId,
          type: ledgerType,
          amount: newBalance - balance,
          balanceAfter: newBalance,
          referenceType: 'refill',
          metadataJson: { source },
        },
      }),
    ]);

    return { balance: newBalance };
  }

  async getLedger(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.ledgerEntry.count({ where: { userId } }),
    ]);
    return {
      items: items.map((e) => ({
        id: e.id,
        type: e.type,
        amount: e.amount.toNumber(),
        balanceAfter: e.balanceAfter.toNumber(),
        createdAt: e.createdAt,
        metadata: e.metadataJson,
      })),
      page,
      limit,
      total,
    };
  }
}
