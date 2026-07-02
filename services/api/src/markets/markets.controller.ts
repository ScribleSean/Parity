import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  marketsQuerySchema,
  quoteRequestSchema,
  tradeExecuteSchema,
} from '@parity/shared';
import { MarketsService } from '../markets/markets.service';
import { TradingService } from '../trading/trading.service';
import {
  CurrentUser,
  JwtAuthGuard,
  Public,
  AuthUser,
} from '../common/auth.guard';

@Controller('markets')
export class MarketsController {
  constructor(
    private markets: MarketsService,
    private trading: TradingService,
  ) {}

  @Public()
  @Get()
  list(@Query() query: unknown) {
    const q = marketsQuerySchema.parse(query);
    return this.markets.list(q);
  }

  @Public()
  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.markets.getBySlug(slug);
  }

  @Public()
  @Get(':slug/history')
  history(@Param('slug') slug: string) {
    return this.markets.getHistory(slug);
  }

  @Public()
  @Get(':slug/trades')
  trades(
    @Param('slug') slug: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.trading.getRecentTrades(
      slug,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':slug/quote')
  quote(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
    @Body() body: unknown,
  ) {
    const input = quoteRequestSchema.parse(body);
    return this.trading.createQuote(user.sub, slug, input);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':slug/trade')
  trade(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
    @Body() body: unknown,
  ) {
    const { quoteId } = tradeExecuteSchema.parse(body);
    return this.trading.executeTrade(user.sub, slug, quoteId);
  }
}

@Controller('positions')
@UseGuards(JwtAuthGuard)
export class PositionsController {
  constructor(private trading: TradingService) {}

  @Get()
  open(@CurrentUser() user: AuthUser) {
    return this.trading.getPositions(user.sub);
  }

  @Get('history')
  history(@CurrentUser() user: AuthUser) {
    return this.trading.getPositionHistory(user.sub);
  }
}
