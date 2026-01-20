import {
  Controller,
  Get,
  Post,
  Body,
  Inject,
  UnauthorizedException,
  BadRequestException,
  Req,
  Res,
  UseGuards,
  InternalServerErrorException,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Authentication, AuthenticatedUserWithIntervenant } from './authentication';
import type { CustomRequest } from '@shared/constants/customRequest';
import type { Response } from 'express';
import { MeGuard } from './me.guard';
import { UserService } from '@user/user.service';
import { DroitsUserService } from '@user/droitsUser.service';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';

@Throttle({ default: { ttl: 60000, limit: 10 } })
@Controller('auth')
export class AuthenticationController {
  constructor(
    @Inject(Authentication) private readonly authentication: Authentication,
    private readonly userService: UserService,
    private readonly droitsUserService: DroitsUserService,
    @Inject(LanceleauGateway) private readonly lanceleauGateway: LanceleauGateway,
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
    @Res({ passthrough: true }) res: Response,
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
        await this.userService.findOrCreateUser(result.user.cerbereId, {
          email: result.user.mel,
          nom: result.user.nom,
          prenom: result.user.prenom,
        });
      } catch (e) {
        throw new InternalServerErrorException(
          `Failed to sync user data: ${e instanceof Error ? e.message : 'Unknown error'}`,
        );
      }

      // Set cookies via AuthenticationService helper
      this.authentication.buildCookieResponse(res, {
        accessToken: result.accessToken,
        idToken: result.idToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      });

      return {
        user: result.user,
        expiresIn: result.expiresIn,
      };
    } catch (error: unknown) {
      throw new UnauthorizedException(
        `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Post('refresh')
  async refresh(@Req() req: CustomRequest, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies['refresh_token'] as string | undefined;
    if (!refreshToken) {
      throw new BadRequestException('Missing refresh token');
    }

    try {
      const tokens = await this.authentication.refreshTokens(refreshToken);

      // Set cookies via AuthenticationService helper
      this.authentication.buildCookieResponse(res, tokens);

      return {
        expiresIn: tokens.expiresIn,
      };
    } catch (error: unknown) {
      throw new UnauthorizedException(
        `Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Post('logout')
  logout(@Body('idToken') idToken: string, @Res({ passthrough: true }) res: Response) {
    if (!idToken) {
      throw new BadRequestException('Missing ID token');
    }

    const cookieOptions = { path: '/', httpOnly: true, secure: true, sameSite: 'strict' as const };
    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);

    const logoutUrl = this.authentication.generateLogoutUrl(idToken);
    return { logoutUrl };
  }

  @Get('me')
  @SkipThrottle({ default: true })
  @UseGuards(MeGuard)
  async me(@Req() req: CustomRequest): Promise<AuthenticatedUserWithIntervenant> {
    const token = req.token || '';
    const user = await this.authentication.getUserInfo(token);
    const intervenant = await this.droitsUserService.findIntervenantByUserSub(user.cerbereId);
    return {
      user,
      intervenant,
    };
  }
}
