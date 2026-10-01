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

  afterAll(async () => {
    await app.close();
  });
});
