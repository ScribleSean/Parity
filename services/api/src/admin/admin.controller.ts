import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  createMarketSchema,
  resolveMarketSchema,
  updateMarketSchema,
} from '@parity/shared';
import { MarketsService } from '../markets/markets.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CurrentUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
  AuthUser,
} from '../common/auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private markets: MarketsService,
    private prisma: PrismaService,
  ) {}

  @Get('markets')
  list(@Query('page') page?: string) {
    return this.markets.list({
      includeDrafts: true,
      page: page ? Number(page) : 1,
      limit: 50,
    });
  }

  @Post('markets')
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const input = createMarketSchema.parse(body);
    return this.markets.create(user.sub, input);
  }

  @Patch('markets/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = updateMarketSchema.parse(body);
    return this.markets.update(id, user.sub, input);
  }

  @Post('markets/:id/publish')
  publish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.markets.publish(id, user.sub);
  }

  @Post('markets/:id/close')
  close(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.markets.close(id, user.sub);
  }

  @Post('markets/:id/resolve')
  resolve(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const { resolution, resolutionNote } = resolveMarketSchema.parse(body);
    return this.markets.resolve(id, user.sub, resolution, resolutionNote);
  }

  @Post('markets/:id/void')
  voidMarket(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.markets.resolve(id, user.sub, 'VOID');
  }

  @Get('audit-log')
  auditLog(@Query('limit') limit?: string) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit ? Number(limit) : 50,
    });
  }
}
