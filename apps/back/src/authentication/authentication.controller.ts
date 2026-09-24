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
  HttpCode,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Authentication, AuthenticatedUserWithIntervenant, AuthenticatedUserAndNomPrenom } from './authentication';
import type { CustomRequest } from '@shared/constants/customRequest';
import type { Response } from 'express';
import { MeGuard } from './me.guard';
import { UserService } from '@user/user.service';
import { DroitsUserService } from '@user/droitsUser.service';
import { LoggerService } from '@shared/logger/logger.service';
import { OidcTransactionService } from './oidcTransaction.service';

const MAX_CODE_LENGTH = 8192;
const MAX_STATE_LENGTH = 512;

@Throttle({ default: { ttl: 60000, limit: 10 } })
@Controller('auth')
export class AuthenticationController {
  constructor(
    @Inject(Authentication) private readonly authentication: Authentication,
    private readonly userService: UserService,
    private readonly droitsUserService: DroitsUserService,
    private readonly logger: LoggerService,
    private readonly oidcTransaction: OidcTransactionService,
  ) {
    this.logger.setContext(AuthenticationController.name);
  }

  @Get('login')
  async login(@Res({ passthrough: true }) res: Response) {
    // La tentative OIDC (state + nonce) est générée côté serveur et liée au
    // navigateur par un cookie signé, pour empêcher un CSRF de connexion.
    const configuration = await this.authentication.getOIDCConfiguration();
    const transaction = await this.oidcTransaction.createTransaction();
    this.oidcTransaction.setTransactionCookie(res, transaction.token);
    res.set('Cache-Control', 'no-store');
    // Le code_challenge (PKCE S256) part vers l'IdP ; le code_verifier
    // reste dans le cookie signé jusqu'à l'échange du code.
    return {
      ...configuration,
      state: transaction.state,
      nonce: transaction.nonce,
      codeChallenge: transaction.codeChallenge,
    };
  }

  @Post('callback')
  async callback(
    @Body('code') code: unknown,
    @Body('state') state: unknown,
    @Body('error') error: string,
    @Body('error_description') errorDescription: string,
    @Req() req: CustomRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Handle OIDC errors
    if (error) {
      throw new BadRequestException(`OIDC Error: ${error} - ${errorDescription || 'No description'}`);
    }

    if (typeof code !== 'string' || code.trim().length === 0 || code.length > MAX_CODE_LENGTH) {
      throw new BadRequestException('Missing or invalid code parameter');
    }

    if (typeof state !== 'string' || state.trim().length === 0 || state.length > MAX_STATE_LENGTH) {
      throw new BadRequestException('Missing or invalid state parameter');
    }

    // La tentative doit avoir été créée par ce même navigateur via GET /auth/login.
    let transaction: { state: string; nonce: string; codeVerifier: string };
    try {
      transaction = await this.oidcTransaction.verifyTransactionToken(
        this.oidcTransaction.readTransactionToken(req.cookies),
      );
    } catch {
      throw new UnauthorizedException('Invalid OIDC transaction');
    }

    if (transaction.state !== state) {
      throw new UnauthorizedException('Invalid OIDC transaction');
    }

    // La tentative est à usage unique : elle est nettoyée avant l'échange OIDC,
    // y compris si l'échange échoue ensuite.
    this.oidcTransaction.clearTransactionCookie(res);

    try {
      // Le nonce et le code_verifier utilisés viennent du cookie vérifié,
      // jamais du corps HTTP.
      const result = await this.authentication.handleCallback(code, transaction.nonce, transaction.codeVerifier);

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

      // Set cookies via AuthenticationService helper (access_token = JWT interne, refresh_token)
      this.authentication.buildCookieResponse(res, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      });

      return {
        user: result.user,
        expiresIn: result.expiresIn,
      };
    } catch (error: unknown) {
      this.logger.error(
        `Authentication callback failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );

      if (error instanceof HttpException) {
        throw error;
      }

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

    const accessToken = req.cookies['access_token'] as string | undefined;
    if (!accessToken) {
      throw new BadRequestException('Missing access token');
    }

    const expectedSubject = await this.authentication.extractSubjectFromExpiredToken(accessToken);

    try {
      const tokens = await this.authentication.refreshTokens(refreshToken, expectedSubject);

      const tokensWithFallbackRefresh: typeof tokens = {
        ...tokens,
        refreshToken: tokens.refreshToken ?? refreshToken,
      };

      // Set cookies via AuthenticationService helper (re-forged internal token)
      this.authentication.buildCookieResponse(res, tokensWithFallbackRefresh);

      return {
        expiresIn: tokens.expiresIn,
      };
    } catch (error: unknown) {
      this.logger.error(
        `Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new UnauthorizedException();
    }
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    this.authentication.clearCookieResponse(res);
  }

  @Get('me')
  @SkipThrottle({ default: true })
  @UseGuards(MeGuard)
  async me(@Req() req: CustomRequest): Promise<AuthenticatedUserWithIntervenant> {
    const authenticatedUser = req.user;

    // Récupérer le profil complet depuis la DB locale (nom, prenom, email sont synchronisés au login).
    // Si l'utilisateur n'existe plus en base (reset DB, compte supprimé), on fallback sur les claims du token.
    let user: AuthenticatedUserAndNomPrenom;
    try {
      const userFromDb = await this.userService.findBySub(authenticatedUser.cerbereId);
      user = {
        ...authenticatedUser,
        nom: userFromDb.nom,
        prenom: userFromDb.prenom,
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
