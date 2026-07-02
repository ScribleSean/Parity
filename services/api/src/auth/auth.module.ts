import { Module, forwardRef } from '@nestjs/common';
import { AuthController, UsersController } from './auth.controller';
import { AuthService, WalletService } from './auth.service';

@Module({
  controllers: [AuthController, UsersController],
  providers: [AuthService, WalletService],
  exports: [AuthService, WalletService],
})
export class AuthModule {}
