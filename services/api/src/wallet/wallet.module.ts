import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from '../auth/auth.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [WalletController],
})
export class WalletModule {}
