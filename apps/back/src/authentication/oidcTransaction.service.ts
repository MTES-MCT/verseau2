import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, jwtVerify } from 'jose';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import type { CookieOptions, Response } from 'express';

export interface OidcTransaction {
  state: string;
  nonce: string;
  /** PKCE code_verifier (RFC 7636), secret côté serveur, envoyé à l'échange de code. */
  codeVerifier: string;
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

  constructor(private readonly configService: ConfigService) {
    const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    this.transactionKey = createHmac('sha256', jwtSecret).update(OIDC_TRANSACTION_DERIVATION_INFO).digest();
  }

  get cookieName(): string {
    return '__Host-verseau_oidc';
  }

  async createTransaction(): Promise<OidcTransaction & { token: string; codeChallenge: string }> {
    const state = randomUUID();
    const nonce = randomUUID();
    // RFC 7636 : code_verifier de 43 à 128 caractères, challenge = BASE64URL(SHA256(verifier)).
    const codeVerifier = randomBytes(64).toString('base64url');
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
    const token = await new SignJWT({ state, nonce, code_verifier: codeVerifier })
      .setProtectedHeader({ alg: 'HS256', typ: OIDC_TRANSACTION_TYP })
      .setIssuedAt()
      .setIssuer(OIDC_TRANSACTION_ISSUER)
      .setAudience(OIDC_TRANSACTION_AUDIENCE)
      .setJti(randomUUID())
      .setExpirationTime(`${OIDC_TRANSACTION_TTL_MS / 1000}s`)
      .sign(this.transactionKey);
    return { state, nonce, codeVerifier, codeChallenge, token };
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
        requiredClaims: ['state', 'nonce', 'code_verifier', 'exp', 'iat', 'jti'],
      });
      const {
        state,
        nonce,
        code_verifier: codeVerifier,
      } = payload as {
        state?: unknown;
        nonce?: unknown;
        code_verifier?: unknown;
      };
      if (!isTransactionValue(state) || !isTransactionValue(nonce) || !isCodeVerifier(codeVerifier)) {
        throw new UnauthorizedException('Invalid OIDC transaction');
      }
      return { state, nonce, codeVerifier };
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
      secure: true,
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

function isCodeVerifier(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 43 && value.length <= 128;
}
