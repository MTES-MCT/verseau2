import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Inject,
  UnauthorizedException,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { Authentication } from './authentication';
import { AuthenticationGuard } from './authentication.guard';
import { AuthenticatedUserDecorator } from './authenticated-user.decorator';
import type { AuthenticatedUser } from './authentication';

@Controller('auth')
export class AuthenticationController {
  constructor(@Inject(Authentication) private readonly authService: Authentication) {}

  @Get('login')
  async login() {
    // Return OIDC configuration for frontend to build authorization URL
    return this.authService.getOIDCConfiguration();
  }

  @Post('callback')
  async callback(
    @Body('code') code: string,
    @Body('nonce') nonce: string,
    @Body('error') error: string,
    @Body('error_description') errorDescription: string,
  ) {
    // Handle OIDC errors
    if (error) {
      throw new BadRequestException(`OIDC Error: ${error} - ${errorDescription || 'No description'}`);
    }

    if (!code) {
      throw new BadRequestException('Missing code parameter');
    }

    if (!nonce) {
      throw new BadRequestException('Missing nonce parameter');
    }

    try {
      const result = await this.authService.handleCallback(code, nonce);

      return {
        accessToken: result.accessToken,
        idToken: result.idToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
        user: result.user,
      };
    } catch (error) {
      throw new UnauthorizedException(
        `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException('Missing refresh token');
    }

    try {
      const tokens = await this.authService.refreshTokens(refreshToken);
      return tokens;
    } catch (error) {
      throw new UnauthorizedException(
        `Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Post('logout')
  async logout(@Body('idToken') idToken: string) {
    if (!idToken) {
      throw new BadRequestException('Missing ID token');
    }

    const logoutUrl = this.authService.generateLogoutUrl(idToken);
    return { logoutUrl };
  }

  @Get('me')
  @UseGuards(AuthenticationGuard)
  async me(@AuthenticatedUserDecorator() user: AuthenticatedUser) {
    return user;
  }
}
