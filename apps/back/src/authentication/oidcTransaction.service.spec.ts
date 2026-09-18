/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { SignJWT } from 'jose';
import { createHmac } from 'node:crypto';
import type { Response } from 'express';
import { OidcTransactionService } from './oidcTransaction.service';

const JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long!!';

function buildConfigService(nodeEnv?: string): jest.Mocked<ConfigService> {
  return {
    get: jest.fn((key: string) => {
      if (key === 'NODE_ENV') {
        return nodeEnv;
      }
      return undefined;
    }),
    getOrThrow: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') {
        return JWT_SECRET;
      }
      throw new Error(`Missing config: ${key}`);
    }),
  } as unknown as jest.Mocked<ConfigService>;
}

async function buildService(nodeEnv?: string): Promise<OidcTransactionService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [{ provide: ConfigService, useValue: buildConfigService(nodeEnv) }, OidcTransactionService],
  }).compile();
  return module.get(OidcTransactionService);
}

describe('OidcTransactionService', () => {
  it('should create a transaction that verifies on the same instance', async () => {
    const service = await buildService();

    const transaction = await service.createTransaction();

    await expect(service.verifyTransactionToken(transaction.token)).resolves.toEqual({
      state: transaction.state,
      nonce: transaction.nonce,
    });
  });

  it('should verify across instances sharing the same secret (multi-instance)', async () => {
    const first = await buildService();
    const second = await buildService();

    const transaction = await first.createTransaction();

    await expect(second.verifyTransactionToken(transaction.token)).resolves.toEqual({
      state: transaction.state,
      nonce: transaction.nonce,
    });
  });

  it('should reject a tampered transaction token', async () => {
    const service = await buildService();
    const transaction = await service.createTransaction();
    const tampered = `${transaction.token.slice(0, -1)}${transaction.token.endsWith('a') ? 'b' : 'a'}`;

    await expect(service.verifyTransactionToken(tampered)).rejects.toThrow(UnauthorizedException);
  });

  it('should reject tokens signed directly with JWT_SECRET (access-token confusion)', async () => {
    const service = await buildService();
    const forged = await new SignJWT({ state: 'x'.repeat(32), nonce: 'y'.repeat(32), sub: 'user-123' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(new TextEncoder().encode(JWT_SECRET));

    await expect(service.verifyTransactionToken(forged)).rejects.toThrow(UnauthorizedException);
  });

  it('should reject expired transaction tokens', async () => {
    const service = await buildService();
    const derivedKey = createHmac('sha256', JWT_SECRET).update('verseau2-oidc-transaction-v1').digest();
    const expired = await new SignJWT({ state: 's'.repeat(32), nonce: 'n'.repeat(32) })
      .setProtectedHeader({ alg: 'HS256', typ: 'OIDC-TX' })
      .setIssuedAt()
      .setIssuer('verseau2')
      .setAudience('verseau2-oidc-transaction')
      .setJti('jti')
      .setExpirationTime('0s')
      .sign(derivedKey);

    await expect(service.verifyTransactionToken(expired)).rejects.toThrow(UnauthorizedException);
  });

  it('should reject missing or malformed tokens without leaking details', async () => {
    const service = await buildService();

    await expect(service.verifyTransactionToken(undefined)).rejects.toThrow('Invalid OIDC transaction');
    await expect(service.verifyTransactionToken('')).rejects.toThrow('Invalid OIDC transaction');
    await expect(service.verifyTransactionToken('not-a-jwt')).rejects.toThrow('Invalid OIDC transaction');
    expect(service.readTransactionToken(undefined)).toBeUndefined();
    expect(service.readTransactionToken({})).toBeUndefined();
  });

  it.each([undefined, 'development', 'test', 'staging', 'production'])(
    'should set and clear a __Host- prefixed secure cookie with NODE_ENV=%s',
    async (nodeEnv) => {
      const service = await buildService(nodeEnv);
      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as unknown as Response;
      const cookieOptions = { httpOnly: true, secure: true, sameSite: 'lax', path: '/' };

      expect(service.cookieName).toBe('__Host-verseau_oidc');
      service.setTransactionCookie(res, 'token');
      expect(res.cookie).toHaveBeenCalledWith('__Host-verseau_oidc', 'token', {
        ...cookieOptions,
        maxAge: 10 * 60 * 1000,
      });

      service.clearTransactionCookie(res);
      expect(res.clearCookie).toHaveBeenCalledWith('__Host-verseau_oidc', cookieOptions);
    },
  );
});
