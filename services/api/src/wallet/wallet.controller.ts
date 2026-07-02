import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { WalletService } from '../auth/auth.service';
import { CurrentUser, JwtAuthGuard, AuthUser } from '../common/auth.guard';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private wallet: WalletService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.wallet.getWallet(user.sub);
  }

  @Post('refill')
  refillFree(@CurrentUser() user: AuthUser) {
    return this.wallet.refillFree(user.sub);
  }

  @Post('refill/ad')
  refillAd(@CurrentUser() user: AuthUser) {
    return this.wallet.refillAd(user.sub);
  }

  @Get('ledger')
  ledger(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.wallet.getLedger(
      user.sub,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }
}
