import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { MarketsModule } from '../markets/markets.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [MarketsModule, PrismaModule],
  controllers: [AdminController],
})
export class AdminModule {}
