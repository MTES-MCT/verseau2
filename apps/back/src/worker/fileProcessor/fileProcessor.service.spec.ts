/* eslint-disable @typescript-eslint/unbound-method */
import { DepotService } from '@dossier/depot/depot.service';
import { DroitsDepotService } from '@dossier/depot/droitsDepot.service';
import { S3 } from '@infra/s3/s3';
import type { Queue } from '@queue/queue';
import { LoggerService } from '@shared/logger/logger.service';
import { UserService } from '@user/user.service';
import { FileProcessorService } from './fileProcessor.service';

describe('FileProcessorService', () => {
  let service: FileProcessorService;
  let queueService: Queue;
  let depotService: DepotService;
  let droitsDepotService: DroitsDepotService;
  let userService: UserService;
  let s3: S3;

  beforeEach(() => {
    queueService = {
      send: jest.fn().mockResolvedValue('job-id'),
    } as unknown as Queue;
    depotService = {
      update: jest.fn().mockResolvedValue({}),
    } as unknown as DepotService;
    droitsDepotService = {
      validateDroits: jest.fn().mockResolvedValue(undefined),
    } as unknown as DroitsDepotService;
    userService = {
      findById: jest.fn().mockResolvedValue({ id: 'user-id', sub: 'user-sub' }),
    } as unknown as UserService;
    s3 = {
      download: jest.fn(),
    } as unknown as S3;
    const logger = {
      setContext: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as LoggerService;

    service = new FileProcessorService(queueService, depotService, droitsDepotService, userService, s3, logger);
  });

  it('should keep SQL injection-shaped XML codes as parameter values', async () => {
    const ouvragePayload = "STEU001' OR '1'='1' --";
    const systemePayload = "SCL001'); DROP TABLE users; --";
    const xml = `
      <FctAssain>
        <Scenario>
          <CodeScenario>FCT_ASSAIN</CodeScenario>
          <VersionScenario>4</VersionScenario>
          <DateDebutReference>2024-01-01</DateDebutReference>
          <Emetteur>
            <CdIntervenant>00000000000000</CdIntervenant>
            <NomIntervenant>Test</NomIntervenant>
          </Emetteur>
        </Scenario>
        <OuvrageDepollution>
          <CdOuvrageDepollution>${ouvragePayload}</CdOuvrageDepollution>
          <TypeOuvrageDepollution>4</TypeOuvrageDepollution>
        </OuvrageDepollution>
        <SystemeCollecte>
          <CdSystemeCollecte>${systemePayload}</CdSystemeCollecte>
        </SystemeCollecte>
      </FctAssain>`;
    (s3.download as jest.Mock).mockResolvedValue(Buffer.from(xml));

    await service.process({
      depotId: 'depot-id',
      filePath: 'depot.xml',
      utilisateur: { id: 'user-id', nom: 'Doe', prenom: 'Jane' },
    });

    expect(droitsDepotService.validateDroits).toHaveBeenCalledWith(
      'user-sub',
      [ouvragePayload],
      [systemePayload],
      false,
    );
  });
});
