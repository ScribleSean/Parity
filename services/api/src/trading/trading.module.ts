import { Module, forwardRef } from '@nestjs/common';
import { TradingService, SettlementService } from './trading.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  providers: [TradingService, SettlementService],
  exports: [TradingService, SettlementService],
})
export class TradingModule {}
