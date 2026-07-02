import {
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { updateProfileSchema } from '@parity/shared';
import { AuthService } from './auth.service';
import { CurrentUser, JwtAuthGuard, Public, AuthUser } from '../common/auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  @Public()
  @Get('google')
  google(@Res() res: Response) {
    return res.redirect(this.auth.getGoogleAuthUrl());
  }

  @Public()
  @Get('apple')
  apple(@Res() res: Response) {
    return res.redirect(this.auth.getAppleAuthUrl());
  }

  @Public()
  @Get('dev/login')
  async devLogin(
    @Query('provider') provider: string,
    @Query('admin') admin: string,
    @Res() res: Response,
  ) {
    if (this.config.get('DEV_AUTH_ENABLED') !== 'true') {
      return res.status(404).json({ message: 'Not found' });
    }
    if (admin === '1') {
      const seed = await this.prisma.user.findFirst({
        where: { role: 'ADMIN' },
      });
      if (seed) {
        await this.auth.setAuthCookies(res, seed.id, seed.email, seed.role);
        return res.redirect(`${this.config.get('WEB_URL')}/auth/callback?ok=1`);
      }
    }
    const user = await this.auth.handleDevLogin(provider);
    await this.auth.setAuthCookies(res, user.id, user.email, user.role);
    return res.redirect(`${this.config.get('WEB_URL')}/auth/callback?ok=1`);
  }

  @Public()
  @Get('callback/google')
  async googleCallback(@Query('code') code: string, @Res() res: Response) {
    if (this.config.get('DEV_AUTH_ENABLED') === 'true' && !this.config.get('GOOGLE_CLIENT_ID')) {
      const user = await this.auth.handleDevLogin('google');
      await this.auth.setAuthCookies(res, user.id, user.email, user.role);
      return res.redirect(`${this.config.get('WEB_URL')}/auth/callback?ok=1`);
    }
    if (!code) return res.redirect(`${this.config.get('WEB_URL')}/login?error=oauth`);
    // Production: exchange code for tokens via Google API
    // For MVP with credentials, implement token exchange here
    const user = await this.auth.handleDevLogin('google');
    await this.auth.setAuthCookies(res, user.id, user.email, user.role);
    return res.redirect(`${this.config.get('WEB_URL')}/auth/callback?ok=1`);
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response) {
    const token = req.cookies?.refresh_token as string | undefined;
    if (!token) return res.status(401).json({ message: 'No refresh token' });
    return res.json(await this.auth.refresh(token, res));
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    const token = req.cookies?.refresh_token as string | undefined;
    return res.json(await this.auth.logout(token, res));
  }
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private auth: AuthService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.getMe(user.sub);
  }

  @Patch('me')
  update(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const data = updateProfileSchema.parse(body);
    return this.auth.updateProfile(user.sub, data);
  }
}
