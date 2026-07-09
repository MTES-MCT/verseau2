import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync } from 'node:crypto';
import { AgenceEauClientService } from './agenceEauClient.service';
import { AgenceEauClientMock } from './agenceEauClient.mock';
import { createAgenceEauClient } from './agenceEauClient.factory';
import { FtpService } from '../ftp/ftp.service';
import { SftpService } from '../sftp/sftp.service';
import { SharedModule } from '@shared/shared.module';
import { loggerProviderMock, LoggerServiceMock } from '@shared/logger/logger.mock';

const createTestPrivateKey = (): string => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  return privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();
};

const artoisPicardiePrivateKey = createTestPrivateKey();
const agence22222222222222PrivateKey = createTestPrivateKey();
const encodedArtoisPicardiePrivateKey = Buffer.from(artoisPicardiePrivateKey, 'utf8').toString('base64');
const encodedAgence22222222222222PrivateKey = Buffer.from(agence22222222222222PrivateKey, 'utf8').toString('base64');
const agenceEauClientConfig = JSON.stringify({
  ARTOIS_PICARDIE: {
    host: 'sftp1.example.com',
    port: 22,
    username: 'user1',
  },
  '22222222222222': {
    host: 'sftp2.example.com',
    port: 22,
    username: 'user2',
  },
  '33333333333333': {
    host: 'sftp3.example.com',
    port: 22,
    username: 'user3',
  },
  '44444444444444': {
    type: 'ftp',
    host: 'ftp4.example.com',
    port: 21,
    username: 'user4',
    secure: true,
  },
});
const agenceEauPrivateKeys: Record<string, string> = {
  SFTP_AGENCY_PRIVATE_KEY_ARTOIS_PICARDIE: encodedArtoisPicardiePrivateKey,
  SFTP_AGENCY_PRIVATE_KEY_22222222222222: encodedAgence22222222222222PrivateKey,
};
const agenceEauPasswords: Record<string, string> = {
  SFTP_AGENCY_PASSWORD_33333333333333: 'agency-password-333',
  SFTP_AGENCY_PASSWORD_44444444444444: 'agency-password-444',
};

describe('AgenceEauClientService', () => {
  describe('avec configuration valide', () => {
    let service: AgenceEauClientService;
    const getConfigValue = (key: string): string | undefined => {
      if (key === 'SFTP_AGENCY_CONFIG') {
        return agenceEauClientConfig;
      }
      if (key.startsWith('SFTP_AGENCY_PRIVATE_KEY_')) {
        return agenceEauPrivateKeys[key];
      }
      if (key.startsWith('SFTP_AGENCY_PASSWORD_')) {
        return agenceEauPasswords[key];
      }
      return undefined;
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [SharedModule],
        providers: [
          AgenceEauClientService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(getConfigValue),
            },
          },
          loggerProviderMock,
        ],
      }).compile();

      service = module.get<AgenceEauClientService>(AgenceEauClientService);
    });

    it('devrait initialiser les clients correctement', () => {
      expect(service.getConfiguredAgencies()).toHaveLength(4);
      expect(service.getConfiguredAgencies()).toContain('ARTOIS_PICARDIE');
      expect(service.getConfiguredAgencies()).toContain('22222222222222');
      expect(service.getConfiguredAgencies()).toContain('33333333333333');
      expect(service.getConfiguredAgencies()).toContain('44444444444444');
    });

    it('devrait retourner un client pour la troisième agence configurée', () => {
      const client = service.getClient('33333333333333');
      expect(client).toBeDefined();
      expect(typeof client.send).toBe('function');
    });

    it('devrait retourner un client pour une agence configurée', () => {
      const client = service.getClient('ARTOIS-PICARDIE');
      expect(client).toBeDefined();
      expect(typeof client.send).toBe('function');
    });

    it("devrait avoir le bon privateKey pour l'agence ARTOIS-PICARDIE", () => {
      const client = service.getClient('ARTOIS-PICARDIE');
      expect((client as any).config.privateKey).toBe(artoisPicardiePrivateKey);
    });

    it("devrait avoir le bon privateKey pour l'agence 22222222222222", () => {
      const client = service.getClient('22222222222222');

      expect((client as any).config.privateKey).toBe(agence22222222222222PrivateKey);
    });

    it("devrait avoir le bon password pour l'agence 33333333333333", () => {
      const client = service.getClient('33333333333333');

      expect((client as any).config.password).toBe('agency-password-333');
      expect((client as any).config.privateKey).toBeUndefined();
    });

    it('devrait créer un client FTP pour une agence avec type ftp', () => {
      const client = service.getClient('44444444444444');

      expect(client).toBeInstanceOf(FtpService);
      expect((client as any).config.password).toBe('agency-password-444');
      expect((client as any).config.secure).toBe(true);
      expect((client as any).config.privateKey).toBeUndefined();
    });

    it("devrait créer un client SFTP par défaut quand le type n'est pas défini", () => {
      expect(service.getClient('ARTOIS-PICARDIE')).toBeInstanceOf(SftpService);
    });

    it('devrait vérifier si un client existe', () => {
      expect(service.hasClient('ARTOIS-PICARDIE')).toBe(true);
      expect(service.hasClient('agence_inexistante')).toBe(false);
    });

    it('devrait vérifier si le host du client est correct', () => {
      const client = service.getClient('ARTOIS-PICARDIE');
      expect((client as any).config.host).toBe('sftp1.example.com');
    });

    it('devrait lever une erreur pour une agence non configurée', () => {
      expect(() => service.getClient('agence_inexistante')).toThrow(
        /Aucun client SFTP configuré pour le code CDB: agence_inexistante/,
      );
    });
  });

  describe('avec configuration vide', () => {
    let service: AgenceEauClientService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [SharedModule],
        providers: [
          AgenceEauClientService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      service = module.get<AgenceEauClientService>(AgenceEauClientService);
    });

    it('devrait initialiser sans erreur', () => {
      expect(service.getConfiguredAgencies()).toHaveLength(0);
    });
  });

  describe('avec configuration invalide', () => {
    const logger = new LoggerServiceMock();
    it('devrait lever une erreur si le JSON est invalide', () => {
      expect(() => {
        new AgenceEauClientService(
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
        new AgenceEauClientService(
          {
            get: jest.fn((key: string) => {
              if (key === 'SFTP_AGENCY_CONFIG') {
                return configJson;
              }
              if (key.startsWith('SFTP_AGENCY_PRIVATE_KEY_')) {
                return encodedArtoisPicardiePrivateKey;
              }
              return undefined;
            }),
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
        new AgenceEauClientService(
          {
            get: jest.fn((key: string) => {
              if (key === 'SFTP_AGENCY_CONFIG') {
                return configJson;
              }
              if (key.startsWith('SFTP_AGENCY_PRIVATE_KEY_')) {
                return encodedArtoisPicardiePrivateKey;
              }
              return undefined;
            }),
          } as unknown as ConfigService,
          logger,
        );
      }).toThrow(/Port invalide pour l'agence 11111111111111: doit être un nombre/);
    });

    it('devrait lever une erreur si la clé privée est invalide', () => {
      const configJson = JSON.stringify({
        '11111111111111': {
          host: 'sftp1.example.com',
          port: 22,
          username: 'user1',
        },
      });
      const invalidPrivateKey = Buffer.from('not a private key', 'utf8').toString('base64');

      expect(() => {
        new AgenceEauClientService(
          {
            get: jest.fn((key: string) => {
              if (key === 'SFTP_AGENCY_CONFIG') {
                return configJson;
              }
              if (key === 'SFTP_AGENCY_PRIVATE_KEY_11111111111111') {
                return invalidPrivateKey;
              }
              return undefined;
            }),
          } as unknown as ConfigService,
          logger,
        );
      }).toThrow(/Invalid SFTP_AGENCY_PRIVATE_KEY_11111111111111: Unsupported key format/);
    });

    it("devrait lever une erreur si aucun credential agence n'est fourni", () => {
      const configJson = JSON.stringify({
        '11111111111111': {
          host: 'sftp1.example.com',
          port: 22,
          username: 'user1',
        },
      });

      expect(() => {
        new AgenceEauClientService(
          {
            get: jest.fn((key: string) => {
              if (key === 'SFTP_AGENCY_CONFIG') {
                return configJson;
              }
              return undefined;
            }),
          } as unknown as ConfigService,
          logger,
        );
      }).toThrow(/Configuration incomplète pour l'agence 11111111111111: privateKey ou password manquant/);
    });

    it("devrait lever une erreur si une agence FTP n'a pas de mot de passe", () => {
      const configJson = JSON.stringify({
        '11111111111111': {
          type: 'ftp',
          host: 'ftp1.example.com',
          port: 21,
          username: 'user1',
        },
      });

      expect(() => {
        new AgenceEauClientService(
          {
            get: jest.fn((key: string) => {
              if (key === 'SFTP_AGENCY_CONFIG') {
                return configJson;
              }
              return undefined;
            }),
          } as unknown as ConfigService,
          logger,
        );
      }).toThrow(/Configuration incomplète pour l'agence 11111111111111: password manquant pour FTP/);
    });

    it('devrait lever une erreur si le type est invalide', () => {
      const configJson = JSON.stringify({
        '11111111111111': {
          type: 'http',
          host: 'ftp1.example.com',
          port: 21,
          username: 'user1',
        },
      });

      expect(() => {
        new AgenceEauClientService(
          {
            get: jest.fn((key: string) => {
              if (key === 'SFTP_AGENCY_CONFIG') {
                return configJson;
              }
              return undefined;
            }),
          } as unknown as ConfigService,
          logger,
        );
      }).toThrow(/Type invalide pour l'agence 11111111111111: doit être "sftp" ou "ftp"/);
    });

    it('devrait lever une erreur si secure est invalide', () => {
      const configJson = JSON.stringify({
        '11111111111111': {
          type: 'ftp',
          host: 'ftp1.example.com',
          port: 21,
          username: 'user1',
          secure: 'yes',
        },
      });

      expect(() => {
        new AgenceEauClientService(
          {
            get: jest.fn((key: string) => {
              if (key === 'SFTP_AGENCY_CONFIG') {
                return configJson;
              }
              return undefined;
            }),
          } as unknown as ConfigService,
          logger,
        );
      }).toThrow(/Secure invalide pour l'agence 11111111111111: doit être un booléen ou "implicit"/);
    });

    it('devrait prioriser la clé privée quand clé privée et mot de passe sont définis', () => {
      const configJson = JSON.stringify({
        '11111111111111': {
          host: 'sftp1.example.com',
          port: 22,
          username: 'user1',
        },
      });

      const service = new AgenceEauClientService(
        {
          get: jest.fn((key: string) => {
            if (key === 'SFTP_AGENCY_CONFIG') {
              return configJson;
            }
            if (key === 'SFTP_AGENCY_PRIVATE_KEY_11111111111111') {
              return encodedArtoisPicardiePrivateKey;
            }
            if (key === 'SFTP_AGENCY_PASSWORD_11111111111111') {
              return 'fallback-password';
            }
            return undefined;
          }),
        } as unknown as ConfigService,
        logger,
      );

      expect((service.getClient('11111111111111') as any).config.privateKey).toBe(artoisPicardiePrivateKey);
      expect((service.getClient('11111111111111') as any).config.password).toBeUndefined();
    });
  });
});

describe('AgenceEauClientMock', () => {
  let mock: AgenceEauClientMock;

  beforeEach(() => {
    mock = new AgenceEauClientMock(new LoggerServiceMock());
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

describe('createAgenceEauClient factory', () => {
  it('devrait retourner AgenceEauClientMock quand SFTP_AGENCY_PROVIDER=mock', () => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'SFTP_AGENCY_PROVIDER') {
          return 'mock';
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    const registry = createAgenceEauClient(configService, new LoggerServiceMock());
    expect(registry).toBeInstanceOf(AgenceEauClientMock);
  });

  it('devrait retourner AgenceEauClientService quand SFTP_AGENCY_PROVIDER=real', () => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'SFTP_AGENCY_PROVIDER') {
          return 'real';
        }
        if (key === 'SFTP_AGENCY_CONFIG') {
          return agenceEauClientConfig;
        }
        if (key.startsWith('SFTP_AGENCY_PRIVATE_KEY_')) {
          return agenceEauPrivateKeys[key];
        }
        if (key.startsWith('SFTP_AGENCY_PASSWORD_')) {
          return agenceEauPasswords[key];
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    const registry = createAgenceEauClient(configService, new LoggerServiceMock());
    expect(registry).toBeInstanceOf(AgenceEauClientService);
  });

  it('devrait retourner AgenceEauClientService par défaut', () => {
    const configService = {
      get: jest.fn(() => undefined),
    } as unknown as ConfigService;

    const registry = createAgenceEauClient(configService, new LoggerServiceMock());
    expect(registry).toBeInstanceOf(AgenceEauClientService);
  });
});
