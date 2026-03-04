import {
  Controller,
  Get,
  Post,
  Body,
  Inject,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Req,
  Res,
  UseGuards,
  InternalServerErrorException,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Authentication, AuthenticatedUser, AuthenticatedUserWithIntervenant } from './authentication';
import type { CustomRequest } from '@shared/constants/customRequest';
import type { Response } from 'express';
import { MeGuard } from './me.guard';
import { UserService } from '@user/user.service';
import { DroitsUserService } from '@user/droitsUser.service';

@Throttle({ default: { ttl: 60000, limit: 10 } })
@Controller('auth')
export class AuthenticationController {
  constructor(
    @Inject(Authentication) private readonly authentication: Authentication,
    private readonly userService: UserService,
    private readonly droitsUserService: DroitsUserService,
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

      // Set cookies via AuthenticationService helper (access_token = JWT interne, cerbere_token, refresh_token)
      this.authentication.buildCookieResponse(res, {
        accessToken: result.accessToken,
        idToken: result.idToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
        cerbereAccessToken: result.cerbereAccessToken,
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

      // Set cookies via AuthenticationService helper (re-forged internal token + cerbere_token)
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
  async logout(@Body('idToken') idToken: string, @Res({ passthrough: true }) res: Response) {
    if (!idToken) {
      throw new BadRequestException('Missing ID token');
    }

    this.authentication.clearCookieResponse(res);

    const logoutUrl = await this.authentication.generateLogoutUrl(idToken);
    return { logoutUrl };
  }

  @Get('me')
  @SkipThrottle({ default: true })
  @UseGuards(MeGuard)
  async me(@Req() req: CustomRequest): Promise<AuthenticatedUserWithIntervenant> {
    const authenticatedUser = req.user;

    // Récupérer le profil complet depuis la DB locale (nom, prenom, email sont synchronisés au login).
    // Si l'utilisateur n'existe plus en base (reset DB, compte supprimé), on fallback sur les claims du token.
    let user: AuthenticatedUser;
    try {
      const userFromDb = await this.userService.findBySub(authenticatedUser.cerbereId);
      user = {
        ...authenticatedUser,
        nom: userFromDb.nom || authenticatedUser.nom,
        prenom: userFromDb.prenom || authenticatedUser.prenom,
        mel: userFromDb.email || authenticatedUser.mel,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        user = authenticatedUser;
      } else {
        throw error;
      }
    }

    // Résoudre le nom de l'intervenant depuis Lanceleau (donnée d'affichage uniquement)
    const intervenant = authenticatedUser.itvCdn
      ? await this.droitsUserService.findIntervenantByUserSub(authenticatedUser.cerbereId)
      : null;

    return {
      user,
      intervenant,
      isExpertNational: authenticatedUser.isExpertNational,
    };
  }
}
