/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { DiffusionRapportProcessorService } from './diffusionRapportProcessor.service';
import { MasaGateway } from '@dossier/masa/masa.gateway';
import { DepotGateway } from '@dossier/depot/depot.gateway';
import { NotificationGateway } from '@notification/notification.gateway';
import { ControleGateway } from '@dossier/controle/controle.gateway';
import { ReponseSandreGateway } from '@dossier/controle/technique/sandre/reponseSandre.gateway';
import { S3 } from '@infra/s3/s3';
import { SftpAgency } from '@infra/sftp/sftpAgency';
import { Sftp } from '@infra/sftp/sftp';
import { RapportPdfGeneratorService } from '@dossier/rapport/rapportPdfGenerator.service';
import { LoggerService } from '@shared/logger/logger.service';
import { MasaProvider } from '@masa/masa.provider';
import { DepotStep } from '@lib/dossier';
import { parseScenarioAssainissementXml } from '@lib/parser';
import type { FctAssainissement } from '@lib/parser';

jest.mock('@lib/parser', () => ({
  parseScenarioAssainissementXml: jest.fn(),
}));

describe('DiffusionRapportProcessorService', () => {
  let service: DiffusionRapportProcessorService;
  let masaGateway: jest.Mocked<MasaGateway>;
  let depotGateway: jest.Mocked<DepotGateway>;
  let notificationGateway: jest.Mocked<NotificationGateway>;
  let controleGateway: jest.Mocked<ControleGateway>;
  let reponseSandreGateway: jest.Mocked<ReponseSandreGateway>;
  let s3: jest.Mocked<S3>;
  let sftpAgency: jest.Mocked<SftpAgency>;
  let agencySftpClient: jest.Mocked<Sftp>;
  let pdfGenerator: jest.Mocked<RapportPdfGeneratorService>;
  let masaProvider: jest.Mocked<MasaProvider>;
  let logger: {
    log: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
    verbose: jest.Mock;
    setContext: jest.Mock;
  };

  const pdfBuffer = Buffer.from('pdf-content');
  const xmlBuffer = Buffer.from('<FctAssain></FctAssain>');
  const depot = {
    id: 'dep_1',
    path: 'depots/dep_1.xml',
    nomOriginalFichier: 'depot.xml',
    user: {
      id: 'user_1',
      email: 'john.doe@example.com',
      prenom: 'John',
      nom: 'Doe',
    },
  } as never;

  function createParsedXml(ouvrageDepollutionCode?: string): FctAssainissement {
    return {
      scenario: {} as never,
      ouvrages: [
        {
          cdOuvrageDepollution: ouvrageDepollutionCode as never,
          typeOuvrageDepollution: 'STEP',
          pointMesure: [],
        },
      ],
      systemesCollecte: [],
    };
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    masaGateway = {
      findById: jest.fn(),
      findByDepotId: jest.fn(),
      saveMasaRetour: jest.fn(),
    } as unknown as jest.Mocked<MasaGateway>;

    depotGateway = {
      createDepot: jest.fn(),
      findDepotById: jest.fn(),
      findDepotByIdWithUser: jest.fn().mockResolvedValue(depot),
      findAllDepotsByAdmin: jest.fn(),
      updateDepot: jest.fn().mockResolvedValue(depot),
      findByUserId: jest.fn(),
      findByItvCdn: jest.fn(),
    } as unknown as jest.Mocked<DepotGateway>;

    notificationGateway = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<NotificationGateway>;

    controleGateway = {
      findByDepotId: jest.fn(),
      findControlesV2ByDepotId: jest.fn().mockResolvedValue([]),
      createControle: jest.fn(),
      createControles: jest.fn(),
    } as unknown as jest.Mocked<ControleGateway>;

    reponseSandreGateway = {
      findByDepotId: jest.fn().mockResolvedValue([]),
      createReponseSandre: jest.fn(),
      updateReponseSandre: jest.fn(),
    } as unknown as jest.Mocked<ReponseSandreGateway>;

    s3 = {
      upload: jest.fn().mockResolvedValue(undefined),
      download: jest.fn().mockResolvedValue(xmlBuffer),
    } as unknown as jest.Mocked<S3>;

    agencySftpClient = {
      send: jest.fn().mockResolvedValue(undefined),
      sendToAgentVerseau: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Sftp>;

    sftpAgency = {
      getClient: jest.fn().mockReturnValue(agencySftpClient),
      hasClient: jest.fn().mockReturnValue(true),
      getConfiguredAgencies: jest.fn().mockReturnValue(['12345678901234']),
    } as unknown as jest.Mocked<SftpAgency>;

    pdfGenerator = {
      generateReport: jest.fn().mockResolvedValue(pdfBuffer),
    } as unknown as jest.Mocked<RapportPdfGeneratorService>;

    masaProvider = {
      findAgenceEauSiretBySteuCode: jest.fn().mockResolvedValue('12345678901234'),
    } as unknown as jest.Mocked<MasaProvider>;

    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      setContext: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiffusionRapportProcessorService,
        { provide: MasaGateway, useValue: masaGateway },
        { provide: DepotGateway, useValue: depotGateway },
        { provide: NotificationGateway, useValue: notificationGateway },
        { provide: ControleGateway, useValue: controleGateway },
        { provide: ReponseSandreGateway, useValue: reponseSandreGateway },
        { provide: S3, useValue: s3 },
        { provide: SftpAgency, useValue: sftpAgency },
        { provide: RapportPdfGeneratorService, useValue: pdfGenerator },
        { provide: MasaProvider, useValue: masaProvider },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();

    module.useLogger(false);
    service = module.get(DiffusionRapportProcessorService);

    jest.mocked(parseScenarioAssainissementXml).mockResolvedValue(createParsedXml('STEU001'));
  });

  it('should upload XML and PDF to the agency-specific SFTP client', async () => {
    await service.process({ depotId: 'dep_1' });

    expect(masaProvider.findAgenceEauSiretBySteuCode).toHaveBeenCalledWith('STEU001');
    expect(sftpAgency.hasClient).toHaveBeenCalledWith('12345678901234');
    expect(sftpAgency.getClient).toHaveBeenCalledWith('12345678901234');
    expect(agencySftpClient.send).toHaveBeenNthCalledWith(1, xmlBuffer, 'verseau2/dep_1/depot.xml');
    expect(agencySftpClient.send).toHaveBeenNthCalledWith(2, pdfBuffer, 'verseau2/dep_1/rapport-masa-dep_1.pdf');
    expect(notificationGateway.sendEmail).toHaveBeenCalled();
    expect(depotGateway.updateDepot).toHaveBeenCalledWith('dep_1', { rapportPath: 'rapports/dep_1/rapport.pdf' });
    expect(depotGateway.updateDepot).toHaveBeenCalledWith('dep_1', { step: DepotStep.SEND_EMAIL_TO_DEPOSANT });
  });

  it('should warn and continue when no ouvrage code is found in XML', async () => {
    jest.mocked(parseScenarioAssainissementXml).mockResolvedValue(createParsedXml(undefined));

    await service.process({ depotId: 'dep_1' });

    expect(logger.warn).toHaveBeenCalledWith(
      "No codeOuvrageDepollution found in XML, skipping Agence de l'eau SFTP upload",
      expect.objectContaining({ depotId: 'dep_1' }),
    );
    expect(masaProvider.findAgenceEauSiretBySteuCode).not.toHaveBeenCalled();
    expect(agencySftpClient.send).not.toHaveBeenCalled();
    expect(notificationGateway.sendEmail).toHaveBeenCalled();
  });

  it('should warn and continue when no agency is found for the ouvrage code', async () => {
    masaProvider.findAgenceEauSiretBySteuCode.mockResolvedValue(null);

    await service.process({ depotId: 'dep_1' });

    expect(logger.warn).toHaveBeenCalledWith(
      "No agence de l'eau SIRET found for ouvrage, skipping Agence de l'eau SFTP upload",
      expect.objectContaining({ depotId: 'dep_1', ouvrageDepollutionCode: 'STEU001' }),
    );
    expect(agencySftpClient.send).not.toHaveBeenCalled();
    expect(notificationGateway.sendEmail).toHaveBeenCalled();
  });

  it('should warn and continue when no SFTP client is configured for the agency', async () => {
    sftpAgency.hasClient.mockReturnValue(false);
    sftpAgency.getConfiguredAgencies.mockReturnValue(['99999999999999']);

    await service.process({ depotId: 'dep_1' });

    expect(logger.warn).toHaveBeenCalledWith(
      "No configured SFTP client for agence de l'eau, skipping upload",
      expect.objectContaining({
        depotId: 'dep_1',
        ouvrageDepollutionCode: 'STEU001',
        agenceEauSiret: '12345678901234',
        configuredAgencies: ['99999999999999'],
      }),
    );
    expect(sftpAgency.getClient).not.toHaveBeenCalled();
    expect(agencySftpClient.send).not.toHaveBeenCalled();
    expect(notificationGateway.sendEmail).toHaveBeenCalled();
  });
});
