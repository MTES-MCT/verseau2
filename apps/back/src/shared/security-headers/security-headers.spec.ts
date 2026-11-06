import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ServeStaticModule } from '@nestjs/serve-static';
import request from 'supertest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSecurityHeadersMiddleware, parseExtraConnectOrigins } from './security-headers';
import type { SecurityHeadersOptions } from './security-headers';

/**
 * Tests de non-régression des en-têtes de sécurité (M1) : les valeurs attendues sont
 * volontairement codées en dur ici pour qu'aucune modification du jeu d'en-têtes ne
 * passe inaperçue.
 *
 * L'app de test est bootée via NestFactory.create — et non Test.createTestingModule —
 * car les providers de ServeStaticModule sont instanciés à la compilation du module de
 * test, avant que l'adapter HTTP ne lui soit rattaché : le loader retombe alors sur
 * NoopLoader et ne sert rien. NestFactory.create suit exactement le flux de
 * mainServer.ts (create → use → init), qui est le comportement à vérifier.
 */
const HSTS_VALUE = 'max-age=31536000; includeSubDomains';
const API_CSP = "default-src 'none'; frame-ancestors 'none'";
const SPA_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://assainissement.developpement-durable.gouv.fr",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');
const SPA_CSP_WITH_SENTRY = SPA_CSP.replace("connect-src 'self'", "connect-src 'self' https://sentry.example.fr");

let spaDistPath: string;

@Controller('version')
class VersionController {
  @Get()
  getVersion() {
    return { status: 'ok' };
  }
}

// Miroir de FrontendStaticModule : le SPA est servi par le même serveur que l'API.
// forRootAsync permet de fournir un rootPath créé dans le beforeAll ; la factory est
// évaluée à l'init de chaque app de test.
@Module({
  imports: [
    ServeStaticModule.forRootAsync({
      useFactory: () => [
        {
          rootPath: spaDistPath,
          renderPath: '/{*wildcard}',
          exclude: ['/api/{*wildcard}'],
        },
      ],
    }),
  ],
  controllers: [VersionController],
})
class TestAppModule {}

const createTestApp = async (options: SecurityHeadersOptions = {}): Promise<NestExpressApplication> => {
  const app = await NestFactory.create<NestExpressApplication>(TestAppModule, { logger: false });
  // Même ordre que mainServer.ts : le middleware est enregistré avant init(),
  // donc devant les middlewares ServeStatic ajoutés à l'initialisation des modules.
  app.use(createSecurityHeadersMiddleware(options));
  app.setGlobalPrefix('api');
  await app.init();
  return app;
};

let apiApp: NestExpressApplication;
let spaApp: NestExpressApplication;
let sentryApp: NestExpressApplication;

beforeAll(() => {
  spaDistPath = mkdtempSync(join(tmpdir(), 'verseau-security-headers-'));
  writeFileSync(join(spaDistPath, 'index.html'), '<!doctype html><html lang="fr"><body>SPA</body></html>');
  mkdirSync(join(spaDistPath, 'assets'));
  writeFileSync(join(spaDistPath, 'assets', 'app.js'), 'console.log("app");');
});

afterAll(() => {
  rmSync(spaDistPath, { recursive: true, force: true });
});

describe("securityHeadersMiddleware - réponses de l'API (/api)", () => {
  beforeAll(async () => {
    apiApp = await createTestApp();
  });

  afterAll(async () => {
    await apiApp.close();
  });

  it('applique les en-têtes communs sur une réponse JSON', async () => {
    await request(apiApp.getHttpServer())
      .get('/api/version')
      .expect(200)
      .expect('X-Content-Type-Options', 'nosniff')
      .expect('X-Frame-Options', 'DENY')
      .expect('Referrer-Policy', 'strict-origin-when-cross-origin')
      .expect('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  });

  it("applique une CSP restrictive sur les réponses de l'API (JSON et téléchargements)", async () => {
    await request(apiApp.getHttpServer()).get('/api/version').expect(200).expect('Content-Security-Policy', API_CSP);
  });

  it("applique les en-têtes également sur les réponses d'erreur (404)", async () => {
    await request(apiApp.getHttpServer())
      .get('/api/route-inconnue')
      .expect(404)
      .expect('X-Content-Type-Options', 'nosniff')
      .expect('X-Frame-Options', 'DENY')
      .expect('Content-Security-Policy', API_CSP);
  });

  it("n'envoie pas HSTS sur une requête HTTP locale", async () => {
    const response = await request(apiApp.getHttpServer()).get('/api/version').expect(200);
    expect(response.headers['strict-transport-security']).toBeUndefined();
  });

  it('envoie HSTS quand x-forwarded-proto vaut https (terminaison TLS amont)', async () => {
    await request(apiApp.getHttpServer())
      .get('/api/version')
      .set('x-forwarded-proto', 'https')
      .expect(200)
      .expect('Strict-Transport-Security', HSTS_VALUE);
  });

  it('envoie HSTS quand x-forwarded-proto contient une liste de proxies dont https est la première valeur', async () => {
    await request(apiApp.getHttpServer())
      .get('/api/version')
      .set('x-forwarded-proto', 'https,http')
      .expect(200)
      .expect('Strict-Transport-Security', HSTS_VALUE);
  });

  it("n'envoie pas HSTS quand x-forwarded-proto vaut http", async () => {
    const response = await request(apiApp.getHttpServer())
      .get('/api/version')
      .set('x-forwarded-proto', 'http')
      .expect(200);
    expect(response.headers['strict-transport-security']).toBeUndefined();
  });
});

describe('securityHeadersMiddleware - réponses du SPA servies par ServeStatic', () => {
  beforeAll(async () => {
    spaApp = await createTestApp();
  });

  afterAll(async () => {
    await spaApp.close();
  });

  it('applique la CSP du SPA et les en-têtes communs sur un fichier statique', async () => {
    await request(spaApp.getHttpServer())
      .get('/assets/app.js')
      .expect(200)
      .expect('Content-Type', /javascript/)
      .expect('X-Content-Type-Options', 'nosniff')
      .expect('X-Frame-Options', 'DENY')
      .expect('Content-Security-Policy', SPA_CSP)
      .expect('Referrer-Policy', 'strict-origin-when-cross-origin')
      .expect('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  });

  it('applique la CSP du SPA sur le fallback index.html (route client inconnue)', async () => {
    await request(spaApp.getHttpServer())
      .get('/tableau-de-bord/route-client')
      .expect(200)
      .expect('Content-Type', /html/)
      .expect('Content-Security-Policy', SPA_CSP)
      .expect('X-Frame-Options', 'DENY');
  });

  it("n'envoie pas HSTS sur le SPA en HTTP local", async () => {
    const response = await request(spaApp.getHttpServer()).get('/').expect(200);
    expect(response.headers['strict-transport-security']).toBeUndefined();
  });

  it('envoie HSTS sur le SPA quand x-forwarded-proto vaut https', async () => {
    await request(spaApp.getHttpServer())
      .get('/')
      .set('x-forwarded-proto', 'https')
      .expect(200)
      .expect('Strict-Transport-Security', HSTS_VALUE);
  });
});

describe('securityHeadersMiddleware - origines connect-src supplémentaires (CSP_EXTRA_CONNECT_SRC)', () => {
  beforeAll(async () => {
    // Ex. l'hôte d'ingestion Sentry, intégré au build du SPA mais inconnu du backend.
    sentryApp = await createTestApp({ extraConnectOrigins: ['https://sentry.example.fr'] });
  });

  afterAll(async () => {
    await sentryApp.close();
  });

  it('étend connect-src de la CSP du SPA sans toucher aux autres directives', async () => {
    await request(sentryApp.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Content-Security-Policy', SPA_CSP_WITH_SENTRY);
  });

  it("laisse la CSP de l'API inchangée", async () => {
    await request(sentryApp.getHttpServer()).get('/api/version').expect(200).expect('Content-Security-Policy', API_CSP);
  });
});

describe('securityHeadersMiddleware - uploads directs S3', () => {
  it.each([
    {
      s3Endpoint: 'https://internal-s3.example.fr',
      s3PublicEndpoint: 'https://public-s3.example.fr:9443/storage?ignored=1#fragment',
      origin: 'https://public-s3.example.fr:9443',
    },
    {
      s3Endpoint: 'https://s3.example.fr/storage',
      s3PublicEndpoint: undefined,
      origin: 'https://s3.example.fr',
    },
    {
      s3Endpoint: 'http://localhost:9000/storage',
      s3PublicEndpoint: '',
      origin: 'http://localhost:9000',
    },
    {
      s3Endpoint: 'http://[::1]:9000/storage',
      s3PublicEndpoint: undefined,
      origin: 'http://[::1]:9000',
    },
    {
      s3Endpoint: 'https://internal-s3.example.fr',
      s3PublicEndpoint: 'https://user:secret@PUBLIC-S3.example.fr:443/storage',
      origin: 'https://public-s3.example.fr',
    },
  ])('autorise uniquement $origin et conserve la configuration explicite', async ({ origin, ...options }) => {
    const app = await createTestApp({ ...options, extraConnectOrigins: ['https://sentry.example.fr'] });
    try {
      await request(app.getHttpServer())
        .get('/tableau-de-bord/depot')
        .expect(200)
        .expect(
          'Content-Security-Policy',
          SPA_CSP_WITH_SENTRY.replace('https://sentry.example.fr', `https://sentry.example.fr ${origin}`),
        );
      await request(app.getHttpServer()).get('/api/version').expect(200).expect('Content-Security-Policy', API_CSP);
    } finally {
      await app.close();
    }
  });

  it('conserve les sources CSP explicites sans les interpréter comme des URLs S3', async () => {
    const app = await createTestApp({
      s3Endpoint: 'https://s3.example.fr',
      extraConnectOrigins: parseExtraConnectOrigins('https://*.sentry.example.fr, wss://events.example.fr'),
    });
    try {
      await request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect(
          'Content-Security-Policy',
          SPA_CSP.replace(
            "connect-src 'self'",
            "connect-src 'self' https://*.sentry.example.fr wss://events.example.fr https://s3.example.fr",
          ),
        );
    } finally {
      await app.close();
    }
  });

  it('ne duplique pas une origine S3 déjà autorisée explicitement', async () => {
    const app = await createTestApp({
      s3Endpoint: 'https://s3.example.fr/storage',
      extraConnectOrigins: ['https://s3.example.fr'],
    });
    try {
      await request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect(
          'Content-Security-Policy',
          SPA_CSP.replace("connect-src 'self'", "connect-src 'self' https://s3.example.fr"),
        );
    } finally {
      await app.close();
    }
  });

  it.each([
    'not-a-url',
    '//s3.example.fr',
    'ftp://s3.example.fr',
    'data:text/plain,upload',
    'https://*.example.fr',
    'https://s3.example.fr;script-src',
  ])('refuse un endpoint S3 invalide ou dangereux : %s', (s3PublicEndpoint) => {
    expect(() => createSecurityHeadersMiddleware({ s3Endpoint: 'https://valid.example.fr', s3PublicEndpoint })).toThrow(
      'Invalid S3 upload endpoint for Content-Security-Policy',
    );
  });
});

describe('parseExtraConnectOrigins', () => {
  it('sépare les origines par virgules ou espaces en trimant les valeurs', () => {
    expect(parseExtraConnectOrigins('https://a.gouv.fr, https://b.gouv.fr')).toEqual([
      'https://a.gouv.fr',
      'https://b.gouv.fr',
    ]);
    expect(parseExtraConnectOrigins('https://a.gouv.fr https://b.gouv.fr')).toEqual([
      'https://a.gouv.fr',
      'https://b.gouv.fr',
    ]);
  });

  it('retourne un tableau vide quand la variable est absente ou vide', () => {
    expect(parseExtraConnectOrigins(undefined)).toEqual([]);
    expect(parseExtraConnectOrigins('')).toEqual([]);
    expect(parseExtraConnectOrigins(' , ')).toEqual([]);
  });
});
