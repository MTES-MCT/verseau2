import { Controller, Get, Post, Body, Inject, UnauthorizedException, BadRequestException, Req } from '@nestjs/common';
import { Authentication } from './authentication';
import type { CustomRequest } from '@shared/constants/customRequest';

@Controller('auth')
export class AuthenticationController {
  constructor(@Inject(Authentication) private readonly authentication: Authentication) {}

  @Get('login')
  login() {
    // Return OIDC configuration for frontend to build authorization URL
    return this.authentication.getOIDCConfiguration();
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
      const result = await this.authentication.handleCallback(code, nonce);

      return {
        accessToken: result.accessToken,
        idToken: result.idToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
        user: result.user,
      };
    } catch (error: unknown) {
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
      const tokens = await this.authentication.refreshTokens(refreshToken);
      return tokens;
    } catch (error: unknown) {
      throw new UnauthorizedException(
        `Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Post('logout')
  logout(@Body('idToken') idToken: string) {
    if (!idToken) {
      throw new BadRequestException('Missing ID token');
    }

    const logoutUrl = this.authentication.generateLogoutUrl(idToken);
    return { logoutUrl };
  }

  @Get('me')
  me(@Req() req: CustomRequest) {
    return req.user;
  }
}
