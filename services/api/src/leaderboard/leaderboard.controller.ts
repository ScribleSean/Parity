import { Controller, Get, Query } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { OptionalUser, Public, AuthUser } from '../common/auth.guard';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private leaderboard: LeaderboardService) {}

  @Public()
  @Get()
  list(
    @Query('period') period?: string,
    @OptionalUser() user?: AuthUser | null,
  ) {
    const p = period === 'weekly' ? 'weekly' : 'alltime';
    return this.leaderboard.getLeaderboard(p, user?.sub);
  }
}
