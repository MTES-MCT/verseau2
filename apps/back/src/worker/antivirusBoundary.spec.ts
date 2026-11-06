/* eslint-disable @typescript-eslint/unbound-method */
import { createMock } from '@golevelup/ts-jest';
import { DepotStep, DepotStatus } from '@lib/dossier';
import type { DepotModel } from '@dossier/depot/depot.model';
import { DepotService } from '@dossier/depot/depot.service';
import { DepotGateway } from '@dossier/depot/depot.gateway';
import { ControleGateway } from '@dossier/controle/controle.gateway';
import { ControleV1Service } from '@dossier/controle/isov1/controlev1.service';
import { ControleMetierV2Service } from '@dossier/controle/metierv2/controleMetierV2.service';
import { SandreService } from '@dossier/controle/technique/sandre/sandre.service';
import type { SandreValidationResult } from '@dossier/controle/technique/sandre/sandre';
import { ReponseSandreGateway } from '@dossier/controle/technique/sandre/reponseSandre.gateway';
import { MasaGateway } from '@dossier/masa/masa.gateway';
import type { MasaModel } from '@dossier/masa/masa.model';
import { S3 } from '@s3/s3';
import { AgentVerseauClient } from '@infra/agentVerseauClient/agentVerseauClient';
import { AgenceEauClient } from '@infra/agenceEauClient/agenceEauClient';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';
import { RapportPdfGeneratorService } from '@dossier/rapport/rapportPdfGenerator.service';
import { MasaProvider } from '@masa/masa.provider';
import { NotificationGateway } from '@notification/notification.gateway';
import { LoggerService } from '@shared/logger/logger.service';
import { Zip } from '@shared/zip/zip';
import { RapportDestinataire, type Queue } from '@queue/queue';
import { DataSource, EntityManager } from 'typeorm';
import { TransferClient } from '@infra/transferClient/transferClient';
import { ControleMetierProcessorService } from './controleMetier/controleMetierProcessor.service';
import { ControleSandreUploadProcessorService } from './controleSandre/controle-sandre-upload.processor.service';
import { ControleSandrePollProcessorService } from './controleSandre/controle-sandre-poll.processor.service';
import { SftpAgentVerseauProcessorService } from './sftp/sftpAgentVerseauProcessor.service';
import { DiffusionRapportProcessorService } from './diffusionRapport/diffusionRapportProcessor.service';
import { parseScenarioAssainissementXml, addNameTagToXml } from '@lib/parser';

jest.mock('@lib/parser', () => {
  const actual = jest.requireActual<typeof import('@lib/parser')>('@lib/parser');
  return {
    ...actual,
    parseScenarioAssainissementXml: jest.fn(actual.parseScenarioAssainissementXml),
    addNameTagToXml: jest.fn(actual.addNameTagToXml),
  };
});

describe('Downstream jobs trust upstream antivirus scanning', () => {
  const job = { depotId: 'dep_1', filePath: 'depots/dep_1/file.xml' };
  const xml = Buffer.from('<root/>');
  beforeEach(() => jest.clearAllMocks());

  it('downstream jobs process the file without reading antivirus evidence again', async () => {
    const depot = createMock<DepotModel>({
      id: job.depotId,
      path: job.filePath,
      status: DepotStatus.EN_COURS_DE_TRAITEMENT,
      step: DepotStep.CONTROLE_SANDRE_IN_PROGRESS,
      nomOriginalFichier: 'depot.xml',
      user: createMock<NonNullable<DepotModel['user']>>({ email: 'user@example.com' }),
    });
    Object.defineProperty(depot, 'antivirusAnalysis', {
      get() {
        throw new Error('Downstream job rechecked antivirus evidence');
      },
    });
    const depots = createMock<DepotService>();
    depots.findById.mockResolvedValue(depot);
    depots.findDepotByIdWithUser.mockResolvedValue(depot);
    const gateway = createMock<DepotGateway>();
    gateway.findDepotByIdWithUser.mockResolvedValue(depot);
    const s3 = createMock<S3>();
    s3.download.mockResolvedValue(xml);
    const logger = createMock<LoggerService>();
    const queue = createMock<Queue>();
    const sandre = createMock<SandreService>();
    const v1 = createMock<ControleV1Service>();
    v1.execute.mockResolvedValue([]);
    const v2 = createMock<ControleMetierV2Service>();
    v2.execute.mockResolvedValue([]);
    const agent = createMock<AgentVerseauClient>();
    const agency = createMock<AgenceEauClient>();
    const transfer = createMock<TransferClient>();
    agency.hasClient.mockReturnValue(true);
    agency.getClient.mockReturnValue(transfer);
    const zip = createMock<Zip>();
    const pdf = createMock<RapportPdfGeneratorService>();
    const dataSource = createMock<DataSource>();
    dataSource.transaction.mockImplementation(async (operation: unknown) =>
      (operation as (manager: EntityManager) => Promise<unknown>)(createMock<EntityManager>()),
    );
    const metier = new ControleMetierProcessorService(
      s3,
      dataSource,
      v2,
      v1,
      depots,
      queue,
      createMock<ControleGateway>(),
      logger,
    );
    const upload = new ControleSandreUploadProcessorService(s3, sandre, depots, queue, logger);
    const poll = new ControleSandrePollProcessorService(
      sandre,
      depots,
      createMock<ReponseSandreGateway>(),
      queue,
      logger,
    );
    const lanceleau = createMock<LanceleauGateway>();
    lanceleau.findOrionContactByEmail.mockResolvedValue({ nom: 'Doe', prenom: 'John' });
    const sftp = new SftpAgentVerseauProcessorService(agent, s3, logger, depots, lanceleau);
    const masaProvider = createMock<MasaProvider>();
    masaProvider.findAgenceEauNomBySteuCode.mockResolvedValue('SEINE-NORMANDIE');
    const masaGateway = createMock<MasaGateway>();
    masaGateway.findById.mockResolvedValue(createMock<MasaModel>({ numeroDepotVerseau1: '1234' }));
    const diffusion = new DiffusionRapportProcessorService(
      masaGateway,
      gateway,
      createMock<NotificationGateway>(),
      createMock<ControleGateway>(),
      createMock<ReponseSandreGateway>(),
      s3,
      agency,
      zip,
      masaProvider,
      pdf,
      logger,
    );
    jest
      .mocked(parseScenarioAssainissementXml)
      .mockResolvedValue({ ouvrages: [{ cdOuvrageDepollution: 'STEU1' }], systemesCollecte: [] } as never);
    jest.mocked(addNameTagToXml).mockReturnValue('<root/>');
    sandre.getLegacyValidationResult.mockResolvedValue({
      ACQ: { AccuseReception: { Acceptation: '2' } },
    } as SandreValidationResult);
    sandre.validateFile.mockResolvedValue({ sessionId: 'session-1', taskId: 'task-1' });

    await metier.process(job);
    expect(v1.execute).toHaveBeenCalled();
    expect(v2.execute).toHaveBeenCalled();
    await upload.process(job);
    expect(sandre.validateFile).toHaveBeenCalledWith({ xml });
    await poll.process({ depotId: job.depotId, jeton: 'task-1', attemptCount: 0 });
    expect(sandre.getLegacyValidationResult).toHaveBeenCalledWith('task-1');
    await sftp.process(job);
    expect(agent.send).toHaveBeenCalledTimes(2);
    await diffusion.process({
      depotId: job.depotId,
      masaId: 'masa-1',
      destinataires: [RapportDestinataire.AGENCE_EAU],
    });
    expect(pdf.generateReport).toHaveBeenCalled();
    expect(zip.createArchive).toHaveBeenCalled();
    expect(transfer.send).toHaveBeenCalledTimes(2);
  });
});
