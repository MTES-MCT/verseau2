/* eslint-disable @typescript-eslint/unbound-method */
import { createMock } from '@golevelup/ts-jest';
import { ControleSandreStatus, ControleStatus, DepotStatus, DepotStep, EtapeMetier } from '@lib/dossier';
import { DepotService } from '@dossier/depot/depot.service';
import { DroitsDepotService } from '@dossier/depot/droitsDepot.service';
import { DepotError, DepotRightsException } from '@dossier/depot/depotError';
import { S3 } from '@infra/s3/s3';
import { UserService } from '@user/user.service';
import type { UserModel } from '@user/user.model';
import { LoggerService } from '@shared/logger/logger.service';
import { QueueName, type Queue } from '@queue/queue';
import { FileProcessorService } from './fileProcessor.service';
import * as parser from '@lib/parser';

jest.mock('@lib/parser', () => {
  const actual = jest.requireActual<typeof import('@lib/parser')>('@lib/parser');
  return { ...actual, parseScenarioAssainissementXml: jest.fn(actual.parseScenarioAssainissementXml) };
});

describe('FileProcessorService', () => {
  const job = { depotId: 'dep_1', filePath: 'depots/dep_1/file.xml', utilisateur: { id: 'u1', nom: 'N', prenom: 'P' } };
  const buffer = Buffer.from('<root/>');

  function setup() {
    const queue = createMock<Queue>();
    queue.send.mockResolvedValue('job-id');
    const depots = createMock<DepotService>();
    const s3 = createMock<S3>();
    s3.download.mockResolvedValue(buffer);
    const rights = createMock<DroitsDepotService>();
    const users = createMock<UserService>();
    users.findById.mockResolvedValue(createMock<UserModel>({ sub: 'sub1' }));
    const logger = createMock<LoggerService>();
    const service = new FileProcessorService(queue, depots, rights, users, s3, logger);
    return { service, queue, depots, s3, rights, users, logger };
  }

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

  it('marks the depot in progress before downloading and dispatches only business controls', async () => {
    const s = setup();
    s.s3.download.mockImplementation(() => {
      expect(s.depots.update).toHaveBeenCalledWith(job.depotId, {
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
        step: DepotStep.CONTROLE_IN_PROGRESS,
        etapeMetier: EtapeMetier.CONTROLE_REFERENTIEL,
        controleStatus: ControleStatus.PENDING,
        controleSandreStatus: ControleSandreStatus.PENDING,
      });
      return Promise.resolve(buffer);
    });

    await s.service.process(job);

    expect(s.s3.download).toHaveBeenCalledWith(job.filePath);
    expect(s.s3.downloadStream).not.toHaveBeenCalled();
    expect(parser.parseScenarioAssainissementXml).toHaveBeenCalledWith(buffer.toString('utf8'));
    expect(s.users.findById).toHaveBeenCalledWith(job.utilisateur.id);
    expect(s.rights.validateDroits).toHaveBeenCalledWith('sub1', [], [], false);
    expect(s.queue.send).toHaveBeenCalledTimes(1);
    expect(s.queue.send).toHaveBeenCalledWith(QueueName.controle_metier, {
      depotId: job.depotId,
      filePath: job.filePath,
    });
    expect(s.depots.update).toHaveBeenCalledTimes(1);
  });

  it('deduplicates ouvrage and collection-system codes before checking rights', async () => {
    const s = setup();
    const parsed = {
      ouvrages: [
        { cdOuvrageDepollution: 'STEU1' },
        { cdOuvrageDepollution: 'STEU1' },
        { cdOuvrageDepollution: 'STEU2' },
        {},
      ],
      systemesCollecte: [{ cdSystemeCollecte: 'SCL1' }, { cdSystemeCollecte: 'SCL1' }, {}],
    } as parser.FctAssainissement;
    jest.mocked(parser.parseScenarioAssainissementXml).mockResolvedValueOnce(parsed);

    await s.service.process(job);

    expect(s.rights.validateDroits).toHaveBeenCalledWith(
      'sub1',
      ['STEU1', 'STEU2'],
      ['SCL1'],
      parser.isFluxQualifie(parsed),
    );
  });

  it.each([DepotError.DROITS_INSUFFISANTS, DepotError.FLUX_QUALIFIE_INTERDIT])(
    'rejects a rights denial with its business error code: %s',
    async (code) => {
      const s = setup();
      s.rights.validateDroits.mockRejectedValueOnce(new DepotRightsException(code));

      await expect(s.service.process(job)).resolves.toBeUndefined();

      expect(s.depots.update).toHaveBeenLastCalledWith(job.depotId, {
        status: DepotStatus.REJETE,
        error: code,
        step: DepotStep.CONTROLE_FAILED,
      });
      expect(s.queue.send).not.toHaveBeenCalled();
    },
  );

  it.each(['download', 'parse', 'user', 'rights', 'dispatch'] as const)(
    'rejects the depot and propagates an unexpected %s error to the worker',
    async (phase) => {
      const s = setup();
      const error = new Error(`${phase} unavailable`);
      switch (phase) {
        case 'download':
          s.s3.download.mockRejectedValueOnce(error);
          break;
        case 'parse':
          jest.mocked(parser.parseScenarioAssainissementXml).mockRejectedValueOnce(error);
          break;
        case 'user':
          s.users.findById.mockRejectedValueOnce(error);
          break;
        case 'rights':
          s.rights.validateDroits.mockRejectedValueOnce(error);
          break;
        case 'dispatch':
          s.queue.send.mockRejectedValueOnce(error);
          break;
      }

      await expect(s.service.process(job)).rejects.toBe(error);

      expect(s.depots.update).toHaveBeenLastCalledWith(job.depotId, {
        status: DepotStatus.REJETE,
        step: DepotStep.CONTROLE_FAILED,
      });
      expect(s.logger.log).toHaveBeenCalledWith('Depot dep_1 - Unexpected error during processing', {
        errorMessage: error.message,
      });
      expect(s.logger.error).not.toHaveBeenCalled();
      expect(s.logger.debug).not.toHaveBeenCalled();
      if (phase !== 'dispatch') {
        expect(s.queue.send).not.toHaveBeenCalled();
      }
      if (phase === 'download') {
        expect(parser.parseScenarioAssainissementXml).not.toHaveBeenCalled();
      }
      if (phase === 'download' || phase === 'parse' || phase === 'user') {
        expect(s.rights.validateDroits).not.toHaveBeenCalled();
      }
    },
  );

  it('rejects a user without a subject before checking rights', async () => {
    const s = setup();
    s.users.findById.mockResolvedValueOnce(createMock<UserModel>({ sub: '' }));

    await expect(s.service.process(job)).rejects.toThrow("L'utilisateur n'a pas de sub renseigné");

    expect(s.depots.update).toHaveBeenLastCalledWith(job.depotId, {
      status: DepotStatus.REJETE,
      step: DepotStep.CONTROLE_FAILED,
    });
    expect(s.rights.validateDroits).not.toHaveBeenCalled();
    expect(s.queue.send).not.toHaveBeenCalled();
  });
});
