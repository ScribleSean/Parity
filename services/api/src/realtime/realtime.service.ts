import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(private gateway: RealtimeGateway) {}

  emitMarketOdds(payload: {
    slug: string;
    yesCents: number;
    noCents: number;
    volume: number;
    qYes?: number;
    qNo?: number;
    b?: number;
    ts: string;
  }) {
    this.gateway.server.to(`market:${payload.slug}`).emit('market.odds', payload);
  }

  emitMarketStatus(payload: {
    slug: string;
    status: string;
    resolution?: string;
  }) {
    this.gateway.server.to(`market:${payload.slug}`).emit('market.status', payload);
  }

  emitMarketTrade(payload: Record<string, unknown>) {
    this.gateway.server
      .to(`market:${payload.slug as string}`)
      .emit('market.trade', payload);
  }

  emitUserWallet(userId: string, balance: number) {
    this.gateway.server.to(`user:${userId}`).emit('user.wallet', { balance });
  }

  emitUserPosition(userId: string, payload: Record<string, unknown>) {
    this.gateway.server.to(`user:${userId}`).emit('user.position', payload);
  }

  emitLeaderboardUpdated(period: string) {
    this.gateway.server.emit('leaderboard.updated', { period });
  }
}
