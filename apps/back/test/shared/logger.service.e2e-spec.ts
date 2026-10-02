import { Test } from '@nestjs/testing';
import { ConsoleLogger, INestApplication } from '@nestjs/common';
import { ClsModule, ClsService } from 'nestjs-cls';
import { SharedModule } from '@shared/shared.module';
import { LoggerService } from '@shared/logger/logger.service';
import { CustomClsStore } from '@shared/logger/cls-store.interface';

describe('LoggerService', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        SharedModule,
        ClsModule.forRoot({
          global: true,
          middleware: { mount: true },
        }),
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it.each(['log', 'warn', 'error', 'debug', 'verbose', 'fatal'] as const)(
    'keeps correlationId isolated across concurrent %s executions',
    async (level) => {
      const cls = app.get<ClsService<CustomClsStore>>(ClsService);
      const logSpy = jest.spyOn(ConsoleLogger.prototype, level).mockImplementation(() => {});

      const runInContext = async (id: string, message: string) => {
        return cls.runWith({ correlationId: id }, async () => {
          const logger = await app.resolve<LoggerService>(LoggerService);
          await new Promise((resolve) => setTimeout(resolve));
          logger[level](message, new Error(`failure-${id}`));
        });
      };

      const id1 = 'uuid-1';
      const msg1 = 'message 1';
      const id2 = 'uuid-2';
      const msg2 = 'message 2';

      await Promise.all([runInContext(id1, msg1), runInContext(id2, msg2)]);

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(`[cid: ${id1}] ${msg1}`));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(`[cid: ${id2}] ${msg2}`));
      expect(logSpy).toHaveBeenCalledTimes(2);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"message":"failure-uuid-1"'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"message":"failure-uuid-2"'));

      logSpy.mockRestore();
    },
  );

  it.each(['log', 'warn', 'error', 'debug', 'verbose', 'fatal'] as const)(
    'keeps explicit job metadata isolated for concurrent %s logs sharing a correlationId',
    async (level) => {
      const cls = app.get<ClsService<CustomClsStore>>(ClsService);
      const logSpy = jest.spyOn(ConsoleLogger.prototype, level).mockImplementation(() => {});
      const runJob = (jobId: string, depotId: string) =>
        cls.runWith(
          { correlationId: 'shared-cid', jobContext: { queueName: 'process_file', jobId, depotId } },
          async () => {
            const logger = await app.resolve<LoggerService>(LoggerService);
            await new Promise((resolve) => setTimeout(resolve));
            logger[level]('Processor step', { ...cls.get('jobContext'), step: 'parsing' });
          },
        );

      await Promise.all([runJob('job_1', 'dep_1'), runJob('job_2', 'dep_2')]);

      expect(logSpy).toHaveBeenCalledTimes(2);
      const metadata = logSpy.mock.calls.map(([message]) => {
        expect(message).toContain('[cid: shared-cid] Processor step');
        return JSON.parse((message as string).split(' - ')[1]) as Record<string, unknown>;
      });
      expect(metadata).toEqual(
        expect.arrayContaining([
          { queueName: 'process_file', jobId: 'job_1', depotId: 'dep_1', step: 'parsing' },
          { queueName: 'process_file', jobId: 'job_2', depotId: 'dep_2', step: 'parsing' },
        ]),
      );
      expect(cls.get('jobContext')).toBeUndefined();
      const logger = await app.resolve<LoggerService>(LoggerService);
      logger[level]('Outside job', { step: 'idle' });
      expect(logSpy).toHaveBeenLastCalledWith('Outside job - {"step":"idle"}');
      logSpy.mockRestore();
    },
  );

  afterAll(async () => {
    await app.close();
  });
});
