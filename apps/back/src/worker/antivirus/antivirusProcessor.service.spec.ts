/* eslint-disable @typescript-eslint/unbound-method */
import { createMock } from '@golevelup/ts-jest';
import { Readable } from 'node:stream';
import { DepotService } from '@dossier/depot/depot.service';
import type { DepotModel } from '@dossier/depot/depot.model';
import { DepotAntivirusGateway } from '@dossier/depot/depotAntivirus.gateway';
import { DepotUploadGateway, DepotUploadTransaction } from '@dossier/depot/depotUpload.gateway';
import { DroitsDepotService } from '@dossier/depot/droitsDepot.service';
import { DepotError } from '@dossier/depot/depotError';
import { AntivirusStatus, DepotStatus, DepotStep } from '@lib/dossier';
import { S3 } from '@infra/s3/s3';
import { AntivirusGateway } from '@infra/antivirus/antivirus.gateway';
import {
  AntivirusTransientError,
  AntivirusUnscannableError,
  AntivirusProtocolError,
} from '@infra/antivirus/antivirus.errors';
import { QueueName } from '@queue/queue';
import { AntivirusProcessorService } from './antivirusProcessor.service';
import { cleanAnalysis, cleanScan } from '../../../test/fixtures/antivirus';
import * as parser from '@lib/parser';

const copyDepot = (depot: DepotModel): DepotModel => ({
  ...depot,
  stepHistory: [...(depot.stepHistory ?? [])],
  antivirusAnalysis: depot.antivirusAnalysis ? { ...depot.antivirusAnalysis } : undefined,
});

jest.mock('@lib/parser', () => {
  const actual = jest.requireActual<typeof import('@lib/parser')>('@lib/parser');
  return { ...actual, parseScenarioAssainissementXml: jest.fn(actual.parseScenarioAssainissementXml) };
});

describe('AntivirusProcessorService streaming lifecycle', () => {
  const job = { depotId: 'dep_1', filePath: 'depots/dep_1/file.xml', utilisateur: { id: 'u1', nom: 'N', prenom: 'P' } };
  const buffer = Buffer.from('<root/>');
  const retry = { retryCount: 0, retryLimit: 3 };

  function setup() {
    let depot = {
      id: job.depotId,
      path: job.filePath,
      status: DepotStatus.EN_COURS_DE_TRAITEMENT,
      step: DepotStep.PENDING,
      stepHistory: [DepotStep.PENDING],
    } as DepotModel;
    const depots = createMock<DepotService>();
    depots.findById.mockImplementation(() => Promise.resolve(copyDepot(depot)));
    const scanner = createMock<AntivirusGateway>();
    scanner.scanStream.mockResolvedValue(cleanScan(buffer));
    const evidence = createMock<DepotAntivirusGateway>();
    evidence.recordScan.mockImplementation((_id, response, path) => {
      const statuses = {
        clean: AntivirusStatus.CLEAN,
        infected: AntivirusStatus.INFECTED,
        error: AntivirusStatus.ERROR,
        unscannable: AntivirusStatus.ERROR,
      };
      depot.antivirusAnalysis = {
        ...cleanAnalysis(job.depotId, path, buffer),
        status: statuses[response.verdict],
        errorCode: response.errorCode ?? null,
        retryable: response.retryable,
      };
      return Promise.resolve(copyDepot(depot));
    });
    const s3 = createMock<S3>();
    const streams: Readable[] = [];
    s3.downloadStream.mockImplementation(() => {
      const stream = Readable.from([buffer]);
      streams.push(stream);
      return Promise.resolve({ stream, size: buffer.length });
    });
    const rights = createMock<DroitsDepotService>();
    const tx = createMock<DepotUploadTransaction>();
    tx.findForUpdate.mockImplementation(() => Promise.resolve(copyDepot(depot)));
    tx.save.mockImplementation((next) => {
      depot = copyDepot(next);
      return Promise.resolve(copyDepot(depot));
    });
    tx.send.mockResolvedValue('follow-up');
    const lifecycle = createMock<DepotUploadGateway>();
    lifecycle.transaction.mockImplementation(async (operation) => {
      const snapshot = copyDepot(depot);
      try {
        return await operation(tx);
      } catch (error) {
        depot = snapshot;
        throw error;
      }
    });
    evidence.completeScan.mockImplementation(async (data, response, signal) => {
      const snapshot = copyDepot(depot);
      try {
        signal?.throwIfAborted();
        const alreadyClean = depot.antivirusAnalysis?.status === AntivirusStatus.CLEAN;
        const saved = response ? await evidence.recordScan(data.depotId, response, data.filePath) : copyDepot(depot);
        if (saved?.antivirusAnalysis?.status === AntivirusStatus.CLEAN && !alreadyClean) {
          await tx.send(QueueName.process_file, data);
        }
        return saved;
      } catch (error) {
        depot = snapshot;
        throw error;
      }
    });
    const service = new AntivirusProcessorService(depots, s3, scanner, evidence, lifecycle);
    return {
      service,
      scanner,
      evidence,
      s3,
      rights,
      tx,
      depots,
      streams,
      get depot() {
        return depot;
      },
    };
  }

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('streams the immutable object and commits clean before dispatch, without downloading a Buffer or parsing', async () => {
    const s = setup();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const record = s.evidence.recordScan.getMockImplementation()!;
    s.evidence.recordScan.mockImplementation(async (...args) => {
      await pending;
      return record(...args);
    });
    const parse = jest.mocked(parser.parseScenarioAssainissementXml);
    const decode = jest.spyOn(buffer, 'toString');
    const signal = new AbortController().signal;
    const processing = s.service.process(job, { ...retry, signal });
    for (let i = 0; i < 20; i++) {
      await Promise.resolve();
    }
    expect(s.scanner.scanStream).toHaveBeenCalledWith(s.streams[0], buffer.length, signal);
    expect(parse).not.toHaveBeenCalled();
    expect(decode).not.toHaveBeenCalled();
    expect(s.tx.send).not.toHaveBeenCalled();
    release();
    await processing;
    expect(s.s3.downloadStream).toHaveBeenCalledTimes(1);
    expect(s.s3.download).not.toHaveBeenCalled();
    expect(s.scanner.scan).not.toHaveBeenCalled();
    expect(s.evidence.recordScan).toHaveBeenCalledWith(job.depotId, cleanScan(buffer), job.filePath);
    expect(s.tx.send).toHaveBeenCalledWith(QueueName.process_file, job);
    expect(s.streams[0].destroyed).toBe(true);
  });

  it('retries a transient failure without rejection, then recovers on the next attempt', async () => {
    const s = setup();
    s.scanner.scanStream.mockRejectedValueOnce(
      new AntivirusTransientError('SCANNER_TIMEOUT', cleanScan(buffer).sha256),
    );
    await expect(s.service.process(job, retry)).rejects.toThrow('SCANNER_TIMEOUT');
    expect(s.depot.status).toBe(DepotStatus.EN_COURS_DE_TRAITEMENT);
    expect(s.depot.antivirusAnalysis?.status).toBe(AntivirusStatus.ERROR);
    expect(s.rights.validateDroits).not.toHaveBeenCalled();
    expect(s.tx.send).not.toHaveBeenCalled();
    await s.service.process(job, { retryCount: 1, retryLimit: 3 });
    expect(s.depot.antivirusAnalysis?.status).toBe(AntivirusStatus.CLEAN);
    expect(s.tx.send).toHaveBeenCalledTimes(1);
  });

  it.each([{ retryCount: 3, retryLimit: 3 }, {}, { retryCount: Number.NaN, retryLimit: 3 }])(
    'records distinct technical exhaustion with bounded metadata %j',
    async (attempt) => {
      const s = setup();
      s.scanner.scanStream.mockRejectedValue(new AntivirusTransientError('BUSY', cleanScan(buffer).sha256));
      await s.service.process(job, attempt);
      expect(s.depot.status).toBe(DepotStatus.REJETE);
      expect(s.depot.error).toBe(DepotError.ANTIVIRUS_RETRY_EXHAUSTED);
      expect(s.tx.send).not.toHaveBeenCalled();
      expect(s.rights.validateDroits).not.toHaveBeenCalled();
    },
  );

  it('uses the retry limit persisted on the job', async () => {
    const s = setup();
    s.scanner.scanStream.mockRejectedValue(new AntivirusTransientError('BUSY', cleanScan(buffer).sha256));
    await expect(s.service.process(job, { retryCount: 3, retryLimit: 4 })).rejects.toThrow('BUSY');
    expect(s.depot.status).toBe(DepotStatus.EN_COURS_DE_TRAITEMENT);
    expect(s.tx.send).not.toHaveBeenCalled();
  });

  it('malware is terminal, without parsing or a second GET on duplicate invocation', async () => {
    const s = setup();
    const parse = jest.mocked(parser.parseScenarioAssainissementXml);
    s.scanner.scanStream.mockResolvedValue({
      ...cleanScan(buffer),
      verdict: 'infected',
      detection: 'Eicar-Test-Signature',
    });
    await s.service.process(job, retry);
    await s.service.process(job, retry);
    expect(s.depot.status).toBe(DepotStatus.REJETE);
    expect(s.depot.error).toBe(DepotError.ANTIVIRUS_INFECTED);
    expect(s.s3.downloadStream).toHaveBeenCalledTimes(1);
    expect(parse).not.toHaveBeenCalled();
    expect(s.tx.send).not.toHaveBeenCalled();
  });

  it.each([
    new AntivirusUnscannableError('SCAN_LIMIT_EXCEEDED', cleanScan(buffer).sha256),
    new AntivirusProtocolError('SCANNER_INVALID_RESPONSE', cleanScan(buffer).sha256),
  ])('deterministic limits/protocol failures terminate without queue retry', async (error) => {
    const s = setup();
    s.scanner.scanStream.mockRejectedValue(error);
    await s.service.process(job, retry);
    expect(s.depot.error).toBe(DepotError.ANTIVIRUS_TECHNICAL_FAILURE);
    expect(s.evidence.recordScan).toHaveBeenCalledWith(job.depotId, error.failure, job.filePath);
    expect(s.rights.validateDroits).not.toHaveBeenCalled();
    expect(s.tx.send).not.toHaveBeenCalled();
  });

  it('a persistence failure cannot authorize parsing', async () => {
    const s = setup();
    const parse = jest.mocked(parser.parseScenarioAssainissementXml);
    s.evidence.recordScan.mockRejectedValue(new Error('SDK-SENTINEL secret.xml TOKEN'));
    await expect(s.service.process(job, retry)).rejects.toThrow('ANTIVIRUS_RETRY');
    expect(s.depot.status).not.toBe(DepotStatus.REJETE);
    expect(parse).not.toHaveBeenCalled();
    expect(s.tx.send).not.toHaveBeenCalled();
  });

  it('enqueue failure rolls back clean evidence and retries the atomic handoff', async () => {
    const s = setup();
    s.tx.send.mockRejectedValueOnce(new Error('queue unavailable'));
    await expect(s.service.process(job, retry)).rejects.toThrow('ANTIVIRUS_RETRY');
    expect(s.depot.step).toBe(DepotStep.PENDING);
    expect(s.depot.antivirusAnalysis?.status).not.toBe(AntivirusStatus.CLEAN);
    await s.service.process(job, { retryCount: 1, retryLimit: 3 });
    expect(s.scanner.scanStream).toHaveBeenCalledTimes(2);
    expect(s.tx.send).toHaveBeenCalledTimes(2); // failed transaction + one committed handoff
    expect(s.tx.save).not.toHaveBeenCalled();
  });

  it('uses the returned persisted state, never the scanner verdict alone', async () => {
    const s = setup();
    s.evidence.recordScan.mockResolvedValue({
      ...s.depot,
      antivirusAnalysis: { ...cleanAnalysis(job.depotId, job.filePath, buffer), status: AntivirusStatus.INFECTED },
    });
    await s.service.process(job, retry);
    expect(s.depot.error).toBe(DepotError.ANTIVIRUS_INFECTED);
    expect(s.rights.validateDroits).not.toHaveBeenCalled();
    expect(s.tx.send).not.toHaveBeenCalled();
  });

  it('does not rescan or enqueue again after a committed clean handoff', async () => {
    const s = setup();
    s.depot.antivirusAnalysis = {
      ...cleanAnalysis(job.depotId, job.filePath, Buffer.from('previous download')),
      engineVersion: null,
      scannedAt: null,
    };
    await s.service.process(job, retry);
    expect(s.scanner.scanStream).not.toHaveBeenCalled();
    expect(s.s3.downloadStream).not.toHaveBeenCalled();
    expect(s.evidence.recordScan).not.toHaveBeenCalled();
    expect(s.rights.validateDroits).not.toHaveBeenCalled();
    expect(s.tx.send).not.toHaveBeenCalled();
  });

  it.each([undefined, AntivirusStatus.PENDING, AntivirusStatus.ERROR])(
    'does not parse or dispatch when persistence returns a nonclean status: %s',
    async (status) => {
      const s = setup();
      s.evidence.recordScan.mockResolvedValue({
        ...s.depot,
        antivirusAnalysis: status ? { ...cleanAnalysis(job.depotId, job.filePath, buffer), status } : undefined,
      });
      await expect(s.service.process(job, retry)).rejects.toThrow('ANTIVIRUS_RETRY');
      expect(parser.parseScenarioAssainissementXml).not.toHaveBeenCalled();
      expect(s.rights.validateDroits).not.toHaveBeenCalled();
      expect(s.tx.send).not.toHaveBeenCalled();
    },
  );

  it.each(['stale-key', 'terminal', 'already-dispatched'])('does not reopen %s jobs', async (state) => {
    const s = setup();
    if (state === 'terminal') {
      s.depot.status = DepotStatus.REJETE;
    }
    if (state === 'already-dispatched') {
      s.depot.step = DepotStep.CONTROLE_IN_PROGRESS;
    }
    await s.service.process(state === 'stale-key' ? { ...job, filePath: 'staging/wrong.xml' } : job, retry);
    expect(s.s3.download).not.toHaveBeenCalled();
    expect(s.scanner.scanStream).not.toHaveBeenCalled();
    expect(s.tx.save).not.toHaveBeenCalled();
  });

  it('cancelled leases never parse, hand off, or reject a newer attempt', async () => {
    const s = setup();
    const abort = new AbortController();
    s.scanner.scanStream.mockImplementation(() => {
      abort.abort();
      return Promise.resolve(cleanScan(buffer));
    });
    await expect(s.service.process(job, { ...retry, signal: abort.signal })).rejects.toThrow('ANTIVIRUS_CANCELLED');
    expect(s.evidence.recordScan).not.toHaveBeenCalled();
    expect(s.rights.validateDroits).not.toHaveBeenCalled();
    expect(s.tx.send).not.toHaveBeenCalled();
    expect(s.tx.save).not.toHaveBeenCalled();
  });

  it('an already cancelled job cannot start another S3 GET or scan', async () => {
    const s = setup();
    await expect(s.service.process(job, { ...retry, signal: AbortSignal.abort() })).rejects.toThrow(
      'ANTIVIRUS_CANCELLED',
    );
    expect(s.s3.download).not.toHaveBeenCalled();
    expect(s.s3.downloadStream).not.toHaveBeenCalled();
    expect(s.scanner.scanStream).not.toHaveBeenCalled();
    expect(s.tx.send).not.toHaveBeenCalled();
    expect(s.tx.save).not.toHaveBeenCalled();
  });

  it('dead-letter finalization records technical exhaustion after a crash without touching XML', async () => {
    const s = setup();
    await s.service.exhausted(job);
    expect(s.depot.error).toBe(DepotError.ANTIVIRUS_RETRY_EXHAUSTED);
    expect(s.depot.status).toBe(DepotStatus.REJETE);
    expect(s.s3.download).not.toHaveBeenCalled();
    expect(s.scanner.scanStream).not.toHaveBeenCalled();
    expect(s.tx.send).not.toHaveBeenCalled();
  });

  it('a late dead letter cannot reject a successfully dispatched or stale-key depot', async () => {
    const s = setup();
    s.depot.step = DepotStep.CONTROLE_IN_PROGRESS;
    await s.service.exhausted(job);
    s.depot.step = DepotStep.PENDING;
    await s.service.exhausted({ ...job, filePath: 'staging/wrong.xml' });
    expect(s.tx.save).not.toHaveBeenCalled();
    expect(s.evidence.recordScan).not.toHaveBeenCalled();
  });

  it('a scan dead letter does not reject clean evidence while process_file is still pending', async () => {
    const s = setup();
    s.depot.antivirusAnalysis = cleanAnalysis(job.depotId, job.filePath, buffer);
    await s.service.exhausted(job);
    expect(s.tx.save).not.toHaveBeenCalled();
    expect(s.evidence.recordScan).not.toHaveBeenCalled();
  });

  it('releases a late S3 response after cancellation', async () => {
    const s = setup();
    const controller = new AbortController();
    let release!: (value: { stream: Readable; size: number }) => void;
    let downloading!: () => void;
    const started = new Promise<void>((resolve) => {
      downloading = resolve;
    });
    s.s3.downloadStream.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
          downloading();
        }),
    );
    const running = s.service.process(job, { ...retry, signal: controller.signal });
    await started;
    expect(s.s3.downloadStream).toHaveBeenCalledWith(job.filePath, controller.signal);
    controller.abort();
    const stream = Readable.from([buffer]);
    release({ stream, size: buffer.length });
    await expect(running).rejects.toThrow('ANTIVIRUS_CANCELLED');
    expect(stream.destroyed).toBe(true);
    expect(s.scanner.scanStream).not.toHaveBeenCalled();
    expect(s.evidence.recordScan).not.toHaveBeenCalled();
    expect(s.evidence.completeScan).not.toHaveBeenCalled();
    expect(s.tx.save).not.toHaveBeenCalled();
  });
});
