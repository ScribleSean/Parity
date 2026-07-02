import { Module, forwardRef } from '@nestjs/common';
import { MarketsService } from './markets.service';
import {
  MarketsController,
  PositionsController,
} from './markets.controller';
import { TradingModule } from '../trading/trading.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [forwardRef(() => TradingModule), RealtimeModule],
  controllers: [MarketsController, PositionsController],
  providers: [MarketsService],
  exports: [MarketsService],
})
export class MarketsModule {}
