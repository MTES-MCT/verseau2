import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, jwtVerify } from 'jose';
import { createHmac, randomUUID } from 'node:crypto';
import type { CookieOptions, Response } from 'express';

export interface OidcTransaction {
  state: string;
  nonce: string;
}

const OIDC_TRANSACTION_ISSUER = 'verseau2';
const OIDC_TRANSACTION_AUDIENCE = 'verseau2-oidc-transaction';
const OIDC_TRANSACTION_TYP = 'OIDC-TX';
const OIDC_TRANSACTION_TTL_MS = 10 * 60 * 1000;
const OIDC_TRANSACTION_DERIVATION_INFO = 'verseau2-oidc-transaction-v1';
const MAX_TRANSACTION_TOKEN_LENGTH = 4096;

/**
 * Transaction OIDC courte portée par un cookie signé.
 * Le backend génère `state` et `nonce`, les signe dans un JWT posé en cookie
 * HttpOnly, puis vérifie le couple (cookie, `state` retourné) au callback.
 * Stateless : toutes les instances API partageant `JWT_SECRET` vérifient le cookie.
 */
@Injectable()
export class OidcTransactionService {
  private readonly transactionKey: Uint8Array;
  private readonly isSecure: boolean;

  constructor(private readonly configService: ConfigService) {
    const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    this.transactionKey = createHmac('sha256', jwtSecret).update(OIDC_TRANSACTION_DERIVATION_INFO).digest();
    this.isSecure = this.configService.get<string>('NODE_ENV') === 'production';
  }

  get cookieName(): string {
    if (this.isSecure) {
      return '__Host-verseau_oidc';
    }
    return 'verseau_oidc';
  }

  async createTransaction(): Promise<OidcTransaction & { token: string }> {
    const state = randomUUID();
    const nonce = randomUUID();
    const token = await new SignJWT({ state, nonce })
      .setProtectedHeader({ alg: 'HS256', typ: OIDC_TRANSACTION_TYP })
      .setIssuedAt()
      .setIssuer(OIDC_TRANSACTION_ISSUER)
      .setAudience(OIDC_TRANSACTION_AUDIENCE)
      .setJti(randomUUID())
      .setExpirationTime('10m')
      .sign(this.transactionKey);
    return { state, nonce, token };
  }

  async verifyTransactionToken(token: unknown): Promise<OidcTransaction> {
    if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TRANSACTION_TOKEN_LENGTH) {
      throw new UnauthorizedException('Invalid OIDC transaction');
    }
    try {
      const { payload } = await jwtVerify(token, this.transactionKey, {
        algorithms: ['HS256'],
        issuer: OIDC_TRANSACTION_ISSUER,
        audience: OIDC_TRANSACTION_AUDIENCE,
        typ: OIDC_TRANSACTION_TYP,
        requiredClaims: ['state', 'nonce', 'exp', 'iat', 'jti'],
      });
      const { state, nonce } = payload as { state?: unknown; nonce?: unknown };
      if (!isTransactionValue(state) || !isTransactionValue(nonce)) {
        throw new UnauthorizedException('Invalid OIDC transaction');
      }
      return { state, nonce };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid OIDC transaction');
    }
  }

  readTransactionToken(cookies: unknown): string | undefined {
    if (typeof cookies !== 'object' || cookies === null) {
      return undefined;
    }
    const token = (cookies as Record<string, unknown>)[this.cookieName];
    if (typeof token !== 'string') {
      return undefined;
    }
    return token;
  }

  private get baseCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.isSecure,
      sameSite: 'lax',
      path: '/',
    };
  }

  setTransactionCookie(res: Response, token: string): void {
    res.cookie(this.cookieName, token, {
      ...this.baseCookieOptions,
      maxAge: OIDC_TRANSACTION_TTL_MS,
    });
  }

  clearTransactionCookie(res: Response): void {
    res.clearCookie(this.cookieName, this.baseCookieOptions);
  }
}

function isTransactionValue(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 16 && value.length <= 256;
}
