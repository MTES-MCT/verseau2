import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SftpAgencyService } from './sftpAgency.service';
import { SftpAgencyMock } from './sftpAgency.mock';
import { createSftpAgency } from './sftpAgency.factory';
import { SharedModule } from '@shared/shared.module';
import { loggerProviderMock, LoggerServiceMock } from '@shared/logger/logger.mock';

describe('SftpAgencyService', () => {
  describe('avec configuration valide', () => {
    let service: SftpAgencyService;

    beforeEach(async () => {
      const configJson = JSON.stringify({
        '11111111111111': {
          host: 'sftp1.example.com',
          port: 22,
          username: 'user1',
          privateKey: 'key1',
        },
        '22222222222222': {
          host: 'sftp2.example.com',
          port: 2222,
          username: 'user2',
          privateKey: 'key2',
        },
      });

      const module: TestingModule = await Test.createTestingModule({
        imports: [SharedModule],
        providers: [
          SftpAgencyService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'SFTP_AGENCY_CONFIG') return configJson;
                return undefined;
              }),
            },
          },
          loggerProviderMock,
        ],
      }).compile();

      service = module.get<SftpAgencyService>(SftpAgencyService);
    });

    it('devrait initialiser les clients correctement', () => {
      expect(service.getConfiguredAgencies()).toHaveLength(2);
      expect(service.getConfiguredAgencies()).toContain('11111111111111');
      expect(service.getConfiguredAgencies()).toContain('22222222222222');
    });

    it('devrait retourner un client pour une agence configurée', () => {
      const client = service.getClient('11111111111111');
      expect(client).toBeDefined();
      expect(typeof client.send).toBe('function');
      expect(typeof client.sendToAgentVerseau).toBe('function');
    });

    it('devrait vérifier si un client existe', () => {
      expect(service.hasClient('11111111111111')).toBe(true);
      expect(service.hasClient('agence_inexistante')).toBe(false);
    });

    it('devrait lever une erreur pour une agence non configurée', () => {
      expect(() => service.getClient('agence_inexistante')).toThrow(
        /Aucun client SFTP configuré pour l'agence: agence_inexistante/,
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
  it('devrait retourner SftpAgencyMock quand SFTP_AGENCES_PROVIDER=mock', () => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'SFTP_AGENCY_PROVIDER') return 'mock';
        return undefined;
      }),
    } as unknown as ConfigService;

    const registry = createSftpAgency(configService, new LoggerServiceMock());
    expect(registry).toBeInstanceOf(SftpAgencyMock);
  });

  it('devrait retourner SftpAgencyService quand SFTP_AGENCES_PROVIDER=real', () => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'SFTP_AGENCES_PROVIDER') return 'real';
        if (key === 'SFTP_AGENCES_CONFIG') return '{}';
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
