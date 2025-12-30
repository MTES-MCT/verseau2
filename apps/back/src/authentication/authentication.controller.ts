import {
  Controller,
  Get,
  Post,
  Body,
  Inject,
  UnauthorizedException,
  BadRequestException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Authentication } from './authentication';
import type { CustomRequest } from '@shared/constants/customRequest';
import { MeGuard } from './me.guard';
import { UserService } from '@user/user.service';

@Controller('auth')
export class AuthenticationController {
  constructor(
    @Inject(Authentication) private readonly authentication: Authentication,
    private readonly userService: UserService,
  ) {}

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

      // Sync user data to DB
      try {
        await this.userService.findOrCreateUser(result.user.cerbereId, '1', {
          email: result.user.mel,
          nom: result.user.nom,
          prenom: result.user.prenom,
        });
      } catch (e) {
        // Log but don't fail authentication if sync fails
        console.error('Failed to sync user data', e);
      }

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
  @UseGuards(MeGuard)
  me(@Req() req: CustomRequest) {
    const token = req.headers.authorization?.split(' ')[1] || '';
    return this.authentication.getUserInfo(token);
  }
}
