/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FileProcessorService } from './fileProcessor.service';
import { S3 } from '@s3/s3';
import { DepotService } from '@dossier/depot/depot.service';
import { DroitsDepotService } from '@dossier/depot/droitsDepot.service';
import { UserService } from '@user/user.service';
import { QueueGateway, QueueName } from '@queue/queue';
import type { Queue } from '@queue/queue';
import { SharedModule } from '@shared/shared.module';
import { loggerProviderMock } from '@shared/logger/logger.mock';
import { ControleSandreStatus, ControleStatus, DepotStep, DepotStatus, EtapeMetier } from '@lib/dossier';
import { DepotError, DepotRightsException } from '@dossier/depot/depotError';
import type { FichierDeDepot } from '@dossier/depot/file/file';
import { DEFAULT_XML_PARSE_BUDGETS } from '@lib/parser';

const fichier: FichierDeDepot = {
  depotId: 'dep_1',
  filePath: 'depots/dep_1/file.xml',
  utilisateur: { id: 'user-1', nom: 'Doe', prenom: 'John' },
};

const enCoursUpdate = {
  status: DepotStatus.EN_COURS_DE_TRAITEMENT,
  step: DepotStep.CONTROLE_IN_PROGRESS,
  etapeMetier: EtapeMetier.CONTROLE_REFERENTIEL,
  controleStatus: ControleStatus.PENDING,
  controleSandreStatus: ControleSandreStatus.PENDING,
};

const compliantXml = `<?xml version="1.0" encoding="UTF-8"?>
<FctAssain xmlns="http://xml.sandre.eaufrance.fr/scenario/fct_assain/4">
  <Scenario>
    <CodeScenario>FCT_ASSAIN</CodeScenario>
    <VersionScenario>4</VersionScenario>
    <Emetteur>
      <CdIntervenant schemeAgencyID="SIRET">00000000000000</CdIntervenant>
      <NomIntervenant>Emetteur Test</NomIntervenant>
    </Emetteur>
  </Scenario>
  <OuvrageDepollution>
    <CdOuvrageDepollution>codeOuvrageDepollution1</CdOuvrageDepollution>
    <TypeOuvrageDepollution>4</TypeOuvrageDepollution>
    <PointMesure>
      <NumeroPointMesure>12345</NumeroPointMesure>
      <Prlvt>
        <DatePrlvt>2024-12-31</DatePrlvt>
        <Support><CdSupport>33</CdSupport></Support>
        <Analyse>
          <RsAnalyse>0</RsAnalyse>
          <StatutRsAnalyse>A</StatutRsAnalyse>
          <QualRsAnalyse>4</QualRsAnalyse>
          <Parametre><CdParametre>1098</CdParametre></Parametre>
        </Analyse>
      </Prlvt>
    </PointMesure>
  </OuvrageDepollution>
  <SystemeCollecte>
    <CdSystemeCollecte>SANDRE_SYSTEME_1</CdSystemeCollecte>
  </SystemeCollecte>
</FctAssain>`;

describe('FileProcessorService', () => {
  let service: FileProcessorService;
  let mockS3: S3;
  let mockDepotService: DepotService;
  let mockDroitsDepotService: DroitsDepotService;
  let mockQueueService: Queue;

  const mockConfigGet = jest.fn((_key: string) => undefined as string | undefined);
  const mockConfigServiceValue = {
    get: mockConfigGet,
  } as unknown as ConfigService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigGet.mockClear();
    mockConfigGet.mockImplementation(() => undefined);

    mockS3 = {
      download: jest.fn(),
    } as unknown as S3;

    mockDepotService = {
      update: jest.fn().mockResolvedValue({}),
    } as unknown as DepotService;

    mockDroitsDepotService = {
      validateDroits: jest.fn().mockResolvedValue(undefined),
    } as unknown as DroitsDepotService;

    mockQueueService = {
      send: jest.fn().mockResolvedValue('job-id'),
      work: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [SharedModule],
      providers: [
        FileProcessorService,
        { provide: S3, useValue: mockS3 },
        { provide: DepotService, useValue: mockDepotService },
        { provide: DroitsDepotService, useValue: mockDroitsDepotService },
        { provide: UserService, useValue: { findById: jest.fn().mockResolvedValue({ id: 'user-1', sub: 'sub-1' }) } },
        { provide: QueueGateway, useValue: mockQueueService },
        { provide: ConfigService, useValue: mockConfigServiceValue },
        loggerProviderMock,
      ],
    }).compile();

    service = module.get<FileProcessorService>(FileProcessorService);
  });

  describe('XML parse budget exceeded', () => {
    it('finalizes the depot as REJETE without retrying when the configured budget is exceeded', async () => {
      mockConfigGet.mockImplementation((key: string) => (key === 'XML_PARSE_MAX_ELEMENTS' ? '10' : undefined));
      (mockS3.download as jest.Mock).mockResolvedValue(Buffer.from(`<root>${'<a/>'.repeat(50)}</root>`));

      // Resolving (not throwing) is the contract: a deterministic budget failure
      // must complete the pg-boss job instead of letting pg-boss retry it.
      await expect(service.process(fichier)).resolves.toBeUndefined();

      expect(mockDepotService.update).toHaveBeenCalledTimes(2);
      expect(mockDepotService.update).toHaveBeenNthCalledWith(1, 'dep_1', enCoursUpdate);
      expect(mockDepotService.update).toHaveBeenNthCalledWith(2, 'dep_1', {
        status: DepotStatus.REJETE,
        error: DepotError.XML_PARSE_BUDGET_EXCEEDED,
        step: DepotStep.CONTROLE_FAILED,
      });

      expect(mockQueueService.send).not.toHaveBeenCalled();
      expect(mockDroitsDepotService.validateDroits).not.toHaveBeenCalled();
    });

    it('stops a realistic tag bomb under the default budgets and finalizes the depot as REJETE', async () => {
      // ~8.8 MB of self-closing elements: a scaled-down version of a 70 MB
      // adversarial upload (~18M elements). Default budgets must abort it.
      const bomb = `<root>${'<a/>'.repeat(2_200_000)}</root>`;
      (mockS3.download as jest.Mock).mockResolvedValue(Buffer.from(bomb));

      await expect(service.process(fichier)).resolves.toBeUndefined();

      expect(mockDepotService.update).toHaveBeenLastCalledWith('dep_1', {
        status: DepotStatus.REJETE,
        error: DepotError.XML_PARSE_BUDGET_EXCEEDED,
        step: DepotStep.CONTROLE_FAILED,
      });
      expect(mockQueueService.send).not.toHaveBeenCalled();
    }, 30_000);
  });

  it('rethrows unexpected parse errors so pg-boss can retry transient failures', async () => {
    (mockS3.download as jest.Mock).mockResolvedValue(Buffer.from('this is not xml'));

    await expect(service.process(fichier)).rejects.toThrow();

    expect(mockDepotService.update).toHaveBeenCalledTimes(2);
    expect(mockDepotService.update).toHaveBeenNthCalledWith(1, 'dep_1', enCoursUpdate);
    expect(mockDepotService.update).toHaveBeenNthCalledWith(2, 'dep_1', {
      status: DepotStatus.REJETE,
      step: DepotStep.CONTROLE_FAILED,
    });
    expect(mockQueueService.send).not.toHaveBeenCalled();
  });

  it('dispatches both control queues after parsing a compliant file', async () => {
    (mockS3.download as jest.Mock).mockResolvedValue(Buffer.from(compliantXml));

    await expect(service.process(fichier)).resolves.toBeUndefined();

    expect(mockDroitsDepotService.validateDroits).toHaveBeenCalledWith(
      'sub-1',
      ['codeOuvrageDepollution1'],
      ['SANDRE_SYSTEME_1'],
      false,
    );
    expect(mockQueueService.send).toHaveBeenCalledTimes(2);
    expect(mockQueueService.send).toHaveBeenCalledWith(QueueName.controle_metier, {
      depotId: 'dep_1',
      filePath: fichier.filePath,
    });
    expect(mockQueueService.send).toHaveBeenCalledWith(QueueName.controle_sandre_upload, {
      depotId: 'dep_1',
      filePath: fichier.filePath,
    });
  });

  it('accepts a file above the default depth limit but below the configured limit', async () => {
    const depth = DEFAULT_XML_PARSE_BUDGETS.maxDepth;
    mockConfigGet.mockImplementation((key) => (key === 'XML_PARSE_MAX_DEPTH' ? String(depth + 1) : undefined));
    const xml = compliantXml.replace('</FctAssain>', `${'<a>'.repeat(depth)}${'</a>'.repeat(depth)}</FctAssain>`);
    (mockS3.download as jest.Mock).mockResolvedValue(Buffer.from(xml));

    await service.process(fichier);

    expect(mockDepotService.update).toHaveBeenCalledTimes(1);
    expect(mockQueueService.send).toHaveBeenCalledTimes(2);
  });

  it('accepts text above the default budget when the effective text budget is raised', async () => {
    mockConfigGet.mockImplementation((key) => (key === 'XML_PARSE_MAX_TEXT_LENGTH' ? '12000000' : undefined));
    const xml = compliantXml.replace('</FctAssain>', `${`<a>${'x'.repeat(1000)}</a>`.repeat(10_500)}</FctAssain>`);
    (mockS3.download as jest.Mock).mockResolvedValue(Buffer.from(xml));

    await service.process(fichier);

    expect(mockDepotService.update).toHaveBeenCalledTimes(1);
    expect(mockQueueService.send).toHaveBeenCalledTimes(2);
  });

  it('finalizes the depot as REJETE without retrying when deposit rights are insufficient', async () => {
    (mockS3.download as jest.Mock).mockResolvedValue(Buffer.from(compliantXml));
    (mockDroitsDepotService.validateDroits as jest.Mock).mockRejectedValue(
      new DepotRightsException(DepotError.DROITS_INSUFFISANTS),
    );

    await expect(service.process(fichier)).resolves.toBeUndefined();

    expect(mockDepotService.update).toHaveBeenLastCalledWith('dep_1', {
      status: DepotStatus.REJETE,
      error: DepotError.DROITS_INSUFFISANTS,
      step: DepotStep.CONTROLE_FAILED,
    });
    expect(mockQueueService.send).not.toHaveBeenCalled();
  });
});
