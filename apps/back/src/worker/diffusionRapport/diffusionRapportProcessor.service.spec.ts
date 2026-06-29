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
import { Zip } from '@shared/zip/zip';
import { ZipService } from '@shared/zip/zip.service';
import { MasaProvider } from '@masa/masa.provider';
import { DepotStep } from '@lib/dossier';
import { parseScenarioAssainissementXml } from '@lib/parser';
import type { FctAssainissement } from '@lib/parser';
import { RapportDestinataire } from '@queue/queue';
import { unzipSync } from 'fflate';
import { MasaStatus } from '@dossier/masa/masa.model';
import type { MasaModel } from '@dossier/masa/masa.model';

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
  const masa: MasaModel = {
    id: 'masa_1',
    depotId: 'dep_1',
    numeroDepotVerseau1: '1234',
    statut: MasaStatus.INTEGRE,
    statutMasa: null,
    rapport: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

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
      findById: jest.fn().mockResolvedValue(masa),
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
      getConfiguredAgencies: jest.fn().mockReturnValue(['SEINE-NORMANDIE']),
    } as unknown as jest.Mocked<SftpAgency>;

    pdfGenerator = {
      generateReport: jest.fn().mockResolvedValue(pdfBuffer),
    } as unknown as jest.Mocked<RapportPdfGeneratorService>;

    masaProvider = {
      findAgenceEauNomBySteuCode: jest.fn().mockResolvedValue('SEINE-NORMANDIE'),
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
        ZipService,
        { provide: Zip, useExisting: ZipService },
        { provide: RapportPdfGeneratorService, useValue: pdfGenerator },
        { provide: MasaProvider, useValue: masaProvider },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();

    module.useLogger(false);
    service = module.get(DiffusionRapportProcessorService);

    jest.mocked(parseScenarioAssainissementXml).mockResolvedValue(createParsedXml('STEU001'));
  });

  function expectFirstSftpCallToContainZipEntries(): void {
    const zipBufferSent = agencySftpClient.send.mock.calls[0]?.[0];
    const zipEntries = unzipSync(zipBufferSent);

    expect(Buffer.from(zipEntries['depot.xml']).toString('utf8')).toBe(xmlBuffer.toString('utf8'));
    expect(Buffer.from(zipEntries['rapport-masa-dep_1.pdf']).toString('utf8')).toBe(pdfBuffer.toString('utf8'));
  }

  it('should send the report to the deposant only', async () => {
    await service.process({ depotId: 'dep_1', destinataires: [RapportDestinataire.DEPOSANT] });

    expect(s3.download).not.toHaveBeenCalled();
    expect(parseScenarioAssainissementXml).not.toHaveBeenCalled();
    expect(masaProvider.findAgenceEauNomBySteuCode).not.toHaveBeenCalled();
    expect(sftpAgency.hasClient).not.toHaveBeenCalled();
    expect(sftpAgency.getClient).not.toHaveBeenCalled();
    expect(agencySftpClient.send).not.toHaveBeenCalled();
    expect(notificationGateway.sendEmail).toHaveBeenCalled();
    expect(depotGateway.updateDepot).toHaveBeenCalledWith('dep_1', { rapportPath: 'rapports/dep_1/rapport.pdf' });
    expect(depotGateway.updateDepot).toHaveBeenCalledWith('dep_1', { step: DepotStep.SEND_EMAIL_TO_DEPOSANT });
  });

  it('should upload ZIP and ACK to the agency-specific SFTP client for SEINE-NORMANDIE', async () => {
    await service.process({
      depotId: 'dep_1',
      destinataires: [RapportDestinataire.DEPOSANT, RapportDestinataire.AGENCE_EAU],
    });

    expect(masaProvider.findAgenceEauNomBySteuCode).toHaveBeenCalledWith('STEU001');
    expect(sftpAgency.hasClient).toHaveBeenCalledWith('SEINE-NORMANDIE');
    expect(sftpAgency.getClient).toHaveBeenCalledWith('SEINE-NORMANDIE');
    expect(agencySftpClient.send).toHaveBeenNthCalledWith(1, expect.any(Buffer), 'depot.xml.zip');
    expect(agencySftpClient.send).toHaveBeenNthCalledWith(2, Buffer.alloc(0), 'depot.xml.zip.ack');
    expectFirstSftpCallToContainZipEntries();
    expect(notificationGateway.sendEmail).toHaveBeenCalled();
    expect(depotGateway.updateDepot).toHaveBeenCalledWith('dep_1', { rapportPath: 'rapports/dep_1/rapport.pdf' });
    expect(depotGateway.updateDepot).toHaveBeenCalledWith('dep_1', { step: DepotStep.SEND_EMAIL_TO_DEPOSANT });
  });

  it.each(['RHONE-MEDITERRANEE', 'ADOUR-GARONNE'])(
    'should upload ZIP and ACK with standard naming for %s',
    async (agenceEauNom) => {
      masaProvider.findAgenceEauNomBySteuCode.mockResolvedValue(agenceEauNom);

      await service.process({
        depotId: 'dep_1',
        masaId: 'masa_1',
        destinataires: [RapportDestinataire.AGENCE_EAU],
      });

      expect(sftpAgency.hasClient).toHaveBeenCalledWith(agenceEauNom);
      expect(sftpAgency.getClient).toHaveBeenCalledWith(agenceEauNom);
      expect(agencySftpClient.send).toHaveBeenNthCalledWith(1, expect.any(Buffer), 'depot.xml.zip');
      expect(agencySftpClient.send).toHaveBeenNthCalledWith(2, Buffer.alloc(0), 'depot.xml.zip.ack');
    },
  );

  it.each(['RHIN-MEUSE', 'LOIRE-BRETAGNE'])(
    'should upload ZIP and ACK with DEPOT naming for %s',
    async (agenceEauNom) => {
      masaProvider.findAgenceEauNomBySteuCode.mockResolvedValue(agenceEauNom);

      await service.process({
        depotId: 'dep_1',
        masaId: 'masa_1',
        destinataires: [RapportDestinataire.AGENCE_EAU],
      });

      expect(sftpAgency.hasClient).toHaveBeenCalledWith(agenceEauNom);
      expect(sftpAgency.getClient).toHaveBeenCalledWith(agenceEauNom);
      expect(agencySftpClient.send).toHaveBeenNthCalledWith(1, expect.any(Buffer), 'DEPOT1234_depot.xml.zip');
      expect(agencySftpClient.send).toHaveBeenNthCalledWith(2, Buffer.alloc(0), 'ACK_DEPOT1234_depot.xml.zip');
    },
  );

  it('should warn and continue when a DEPOT naming agency has no numeroDepotVerseau1', async () => {
    masaGateway.findById.mockResolvedValue({ ...masa, numeroDepotVerseau1: null });
    masaProvider.findAgenceEauNomBySteuCode.mockResolvedValue('RHIN-MEUSE');

    await service.process({
      depotId: 'dep_1',
      masaId: 'masa_1',
      destinataires: [RapportDestinataire.DEPOSANT, RapportDestinataire.AGENCE_EAU],
    });

    expect(logger.warn).toHaveBeenCalledWith(
      "No SFTP filename rule for agence de l'eau, skipping upload",
      expect.objectContaining({
        agenceEauNom: 'RHIN-MEUSE',
        depotId: 'dep_1',
        numeroDepotVerseau1: null,
        ouvrageDepollutionCode: 'STEU001',
      }),
    );
    expect(sftpAgency.hasClient).not.toHaveBeenCalled();
    expect(sftpAgency.getClient).not.toHaveBeenCalled();
    expect(agencySftpClient.send).not.toHaveBeenCalled();
    expect(notificationGateway.sendEmail).toHaveBeenCalled();
  });

  it('should warn and continue when the agency has no SFTP filename rule', async () => {
    masaProvider.findAgenceEauNomBySteuCode.mockResolvedValue('ARTOIS-PICARDIE');

    await service.process({
      depotId: 'dep_1',
      destinataires: [RapportDestinataire.DEPOSANT, RapportDestinataire.AGENCE_EAU],
    });

    expect(sftpAgency.hasClient).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      "No SFTP filename rule for agence de l'eau, skipping upload",
      expect.objectContaining({
        agenceEauNom: 'ARTOIS-PICARDIE',
        depotId: 'dep_1',
        ouvrageDepollutionCode: 'STEU001',
      }),
    );
    expect(sftpAgency.getClient).not.toHaveBeenCalled();
    expect(agencySftpClient.send).not.toHaveBeenCalled();
    expect(notificationGateway.sendEmail).toHaveBeenCalled();
  });

  it('should warn and continue when no ouvrage code is found in XML', async () => {
    jest.mocked(parseScenarioAssainissementXml).mockResolvedValue(createParsedXml(undefined));

    await service.process({
      depotId: 'dep_1',
      destinataires: [RapportDestinataire.DEPOSANT, RapportDestinataire.AGENCE_EAU],
    });

    expect(logger.warn).toHaveBeenCalledWith(
      "No codeOuvrageDepollution found in XML, skipping Agence de l'eau SFTP upload",
      expect.objectContaining({ depotId: 'dep_1' }),
    );
    expect(masaProvider.findAgenceEauNomBySteuCode).not.toHaveBeenCalled();
    expect(agencySftpClient.send).not.toHaveBeenCalled();
    expect(notificationGateway.sendEmail).toHaveBeenCalled();
  });

  it('should warn and continue when no agency is found for the ouvrage code', async () => {
    masaProvider.findAgenceEauNomBySteuCode.mockResolvedValue(null);

    await service.process({
      depotId: 'dep_1',
      destinataires: [RapportDestinataire.DEPOSANT, RapportDestinataire.AGENCE_EAU],
    });

    expect(logger.warn).toHaveBeenCalledWith(
      "No agence de l'eau code found for ouvrage, skipping Agence de l'eau SFTP upload",
      expect.objectContaining({ depotId: 'dep_1', ouvrageDepollutionCode: 'STEU001' }),
    );
    expect(agencySftpClient.send).not.toHaveBeenCalled();
    expect(notificationGateway.sendEmail).toHaveBeenCalled();
  });

  it('should warn and continue when no SFTP client is configured for the agency', async () => {
    sftpAgency.hasClient.mockReturnValue(false);
    sftpAgency.getConfiguredAgencies.mockReturnValue(['99999999999999']);

    await service.process({
      depotId: 'dep_1',
      destinataires: [RapportDestinataire.DEPOSANT, RapportDestinataire.AGENCE_EAU],
    });

    expect(logger.warn).toHaveBeenCalledWith(
      "No configured SFTP client for agence de l'eau, skipping upload",
      expect.objectContaining({
        agenceEauNom: 'SEINE-NORMANDIE',
        configuredAgencies: ['99999999999999'],
        depotId: 'dep_1',
        ouvrageDepollutionCode: 'STEU001',
      }),
    );
    expect(sftpAgency.getClient).not.toHaveBeenCalled();
    expect(agencySftpClient.send).not.toHaveBeenCalled();
    expect(notificationGateway.sendEmail).toHaveBeenCalled();
  });
});
