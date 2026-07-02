import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WalletModule } from './wallet/wallet.module';
import { MarketsModule } from './markets/markets.module';
import { TradingModule } from './trading/trading.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { AdminModule } from './admin/admin.module';
import { RealtimeModule } from './realtime/realtime.module';
import { JobsService } from './jobs/jobs.service';
import { JwtAuthGuard } from './common/auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'dev-jwt-secret',
    }),
    PrismaModule,
    RealtimeModule,
    AuthModule,
    WalletModule,
    TradingModule,
    MarketsModule,
    LeaderboardModule,
    AdminModule,
  ],
  providers: [
    JobsService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
