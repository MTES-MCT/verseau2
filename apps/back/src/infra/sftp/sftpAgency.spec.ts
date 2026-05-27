import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SftpAgencyService } from './sftpAgency.service';
import { SftpAgencyMock } from './sftpAgency.mock';
import { createSftpAgency } from './sftpAgency.factory';
import { SharedModule } from '@shared/shared.module';
import { loggerProviderMock, LoggerServiceMock } from '@shared/logger/logger.mock';
import * as dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({
  path: path.join(__dirname, 'test.envfile'),
});

describe('SftpAgencyService', () => {
  describe('avec configuration valide', () => {
    let service: SftpAgencyService;
    const getConfigValue = (key: string): string | undefined => {
      if (key === 'SFTP_AGENCY_CONFIG') {
        return process.env.SFTP_AGENCY_CONFIG;
      }
      if (key.startsWith('SFTP_AGENCY_PRIVATE_KEY_')) {
        return process.env[key];
      }
      return undefined;
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [SharedModule],
        providers: [
          SftpAgencyService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(getConfigValue),
            },
          },
          loggerProviderMock,
        ],
      }).compile();

      service = module.get<SftpAgencyService>(SftpAgencyService);
    });

    it('devrait initialiser les clients correctement', () => {
      expect(service.getConfiguredAgencies()).toHaveLength(3);
      expect(service.getConfiguredAgencies()).toContain('ARTOIS-PICARDIE');
      expect(service.getConfiguredAgencies()).toContain('22222222222222');
      expect(service.getConfiguredAgencies()).toContain('33333333333333');
    });

    it('devrait retourner un client pour la troisième agence configurée', () => {
      const client = service.getClient('33333333333333');
      expect(client).toBeDefined();
      expect(typeof client.send).toBe('function');
      expect(typeof client.sendToAgentVerseau).toBe('function');
    });

    it('devrait retourner un client pour une agence configurée', () => {
      const client = service.getClient('ARTOIS-PICARDIE');
      expect(client).toBeDefined();
      expect(typeof client.send).toBe('function');
      expect(typeof client.sendToAgentVerseau).toBe('function');
    });

    it("devrait avoir le bon privateKey pour l'agence ARTOIS-PICARDIE", () => {
      const client = service.getClient('ARTOIS-PICARDIE');
      expect((client as any).config.privateKey).toBe(
        `-----BEGIN OPENSSH PRIVATE KEY-----\naaa\n-----END OPENSSH PRIVATE KEY-----\n`,
      );
    });

    it("devrait avoir le bon privateKey pour l'agence 22222222222222", () => {
      const client = service.getClient('22222222222222');
      console.log('Client config:', (client as any).config); // Debug: afficher la configuration du client

      expect((client as any).config.privateKey).toBe(`key2\n`);
    });

    it('devrait vérifier si un client existe', () => {
      expect(service.hasClient('ARTOIS-PICARDIE')).toBe(true);
      expect(service.hasClient('agence_inexistante')).toBe(false);
    });

    it('devrait vérifier si le host du client est correct', () => {
      const client = service.getClient('ARTOIS-PICARDIE');
      expect((client as any).config.host).toBe('sftp1.example.com');
    });

    it('devrait retourner la clé privée décodée pour une agence', () => {
      const expectedKey = `-----BEGIN OPENSSH PRIVATE KEY-----\naaa\n-----END OPENSSH PRIVATE KEY-----\n`;

      const privateKey = service.getPrivateKey('ARTOIS-PICARDIE');
      expect(privateKey).toBe(expectedKey);
    });

    it('devrait lever une erreur si la clé privée est manquante', () => {
      expect(() => service.getPrivateKey('agence_sans_cle')).toThrow(
        /Configuration incomplète pour l'agence agence_sans_cle: privateKey manquant/,
      );
    });

    it('devrait lever une erreur pour une agence non configurée', () => {
      expect(() => service.getClient('agence_inexistante')).toThrow(
        /Aucun client SFTP configuré pour le code CDB: agence_inexistante/,
      );
    });
  });

  describe('avec configuration vide', () => {
    let service: SftpAgencyService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [SharedModule],
        providers: [
          SftpAgencyService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      service = module.get<SftpAgencyService>(SftpAgencyService);
    });

    it('devrait initialiser sans erreur', () => {
      expect(service.getConfiguredAgencies()).toHaveLength(0);
    });
  });

  describe('avec configuration invalide', () => {
    const logger = new LoggerServiceMock();
    it('devrait lever une erreur si le JSON est invalide', () => {
      expect(() => {
        new SftpAgencyService(
          {
            get: jest.fn(() => '{invalid json'),
          } as unknown as ConfigService,
          logger,
        );
      }).toThrow(/Configuration SFTP invalide/);
    });

    it('devrait lever une erreur si un champ requis manque', () => {
      const configJson = JSON.stringify({
        '11111111111111': {
          host: 'sftp1.example.com',
          // port manquant
          username: 'user1',
          privateKey: 'key1',
        },
      });

      expect(() => {
        new SftpAgencyService(
          {
            get: jest.fn(() => configJson),
          } as unknown as ConfigService,
          logger,
        );
      }).toThrow(/Configuration incomplète pour l'agence 11111111111111: port manquant/);
    });

    it("devrait lever une erreur si le port n'est pas un nombre", () => {
      const configJson = JSON.stringify({
        '11111111111111': {
          host: 'sftp1.example.com',
          port: '22', // string au lieu de number
          username: 'user1',
          privateKey: 'key1',
        },
      });

      expect(() => {
        new SftpAgencyService(
          {
            get: jest.fn(() => configJson),
          } as unknown as ConfigService,
          logger,
        );
      }).toThrow(/Port invalide pour l'agence 11111111111111: doit être un nombre/);
    });
  });
});

describe('SftpAgencyMock', () => {
  let mock: SftpAgencyMock;

  beforeEach(() => {
    mock = new SftpAgencyMock(new LoggerServiceMock());
  });

  it("devrait retourner un client mock pour n'importe quelle agence", () => {
    const client1 = mock.getClient('11111111111111');
    const client2 = mock.getClient('agence_inexistante');

    expect(client1).toBeDefined();
    expect(client2).toBeDefined();
  });

  it("devrait toujours indiquer qu'un client existe", () => {
    expect(mock.hasClient('11111111111111')).toBe(true);
    expect(mock.hasClient('n_importe_quoi')).toBe(true);
  });

  it('devrait retourner la liste des agences par défaut', () => {
    const agencies: string[] = mock.getConfiguredAgencies();
    expect(agencies).toHaveLength(6);
    expect(agencies).toContain('11111111111111');
  });
});

describe('createSftpAgency factory', () => {
  it('devrait retourner SftpAgencyMock quand SFTP_AGENCY_PROVIDER=mock', () => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'SFTP_AGENCY_PROVIDER') {
          return 'mock';
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    const registry = createSftpAgency(configService, new LoggerServiceMock());
    expect(registry).toBeInstanceOf(SftpAgencyMock);
  });

  it('devrait retourner SftpAgencyService quand SFTP_AGENCY_PROVIDER=real', () => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'SFTP_AGENCY_PROVIDER') {
          return process.env.SFTP_AGENCY_PROVIDER;
        }
        if (key === 'SFTP_AGENCY_CONFIG') {
          return process.env.SFTP_AGENCY_CONFIG;
        }
        if (key.startsWith('SFTP_AGENCY_PRIVATE_KEY_')) {
          return process.env[key];
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    const registry = createSftpAgency(configService, new LoggerServiceMock());
    expect(registry).toBeInstanceOf(SftpAgencyService);
  });

  it('devrait retourner SftpAgencyService par défaut', () => {
    const configService = {
      get: jest.fn(() => undefined),
    } as unknown as ConfigService;

    const registry = createSftpAgency(configService, new LoggerServiceMock());
    expect(registry).toBeInstanceOf(SftpAgencyService);
  });
});
