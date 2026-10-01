/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { SftpAgentVerseauProcessorService } from './sftpAgentVerseauProcessor.service';
import { AgentVerseauClient } from '@infra/agentVerseauClient/agentVerseauClient';
import { S3 } from '@s3/s3';
import { DepotService } from '@dossier/depot/depot.service';
import { DepotWorkflowService } from '@dossier/depot/depotWorkflow.service';
import { LoggerService } from '@shared/logger/logger.service';
import { addNameTagToXml } from '@lib/parser';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';

jest.mock('@lib/parser', () => ({
  addNameTagToXml: jest.fn((xml, name) => `${xml}<!-- added ${name} -->`),
}));

describe('SftpAgentVerseauProcessorService', () => {
  let service: SftpAgentVerseauProcessorService;
  let mockAgentVerseauClient: AgentVerseauClient;
  let mockS3: S3;
  let mockDepotService: DepotService;
  let workflow: jest.Mocked<
    Pick<DepotWorkflowService, 'startSftpTransfer' | 'completeSftpTransfer' | 'failSftpTransfer'>
  >;
  let mockLanceleauGateway: jest.Mocked<LanceleauGateway>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAgentVerseauClient = {
      send: jest.fn().mockResolvedValue(undefined),
    };

    mockS3 = {
      download: jest.fn().mockResolvedValue(Buffer.from('<xml></xml>')),
    } as unknown as S3;

    mockDepotService = {
      findDepotByIdWithUser: jest.fn().mockResolvedValue({
        id: 'depot-1',
        path: 'depots/depot-1/file.xml',
        nomOriginalFichier: 'test.xml',
        userId: 'user-1',
        user: { email: 'user@example.com', nom: 'Cerbere', prenom: 'Contact' },
      }),
    } as unknown as DepotService;

    workflow = {
      startSftpTransfer: jest.fn().mockResolvedValue(true),
      completeSftpTransfer: jest.fn().mockResolvedValue(true),
      failSftpTransfer: jest.fn().mockResolvedValue(true),
    };

    mockLanceleauGateway = {
      findOrionContactByEmail: jest.fn().mockResolvedValue({ nom: 'Doe', prenom: 'John' }),
    } as unknown as jest.Mocked<LanceleauGateway>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SftpAgentVerseauProcessorService,
        { provide: AgentVerseauClient, useValue: mockAgentVerseauClient },
        { provide: S3, useValue: mockS3 },
        { provide: DepotService, useValue: mockDepotService },
        { provide: DepotWorkflowService, useValue: workflow },
        { provide: LanceleauGateway, useValue: mockLanceleauGateway },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
            setContext: jest.fn(),
          },
        },
      ],
    }).compile();

    module.useLogger(false);
    service = module.get<SftpAgentVerseauProcessorService>(SftpAgentVerseauProcessorService);
  });

  it('should download, modify XML with user name, and send to SFTP', async () => {
    const depotId = 'depot-1';
    const filePath = 's3/path.xml';
    const originalXml = '<xml></xml>';
    (mockS3.download as jest.Mock).mockResolvedValue(Buffer.from(originalXml));

    await service.process({ depotId, filePath });

    expect(workflow.startSftpTransfer).toHaveBeenCalledWith(depotId);

    expect(mockDepotService.findDepotByIdWithUser).toHaveBeenCalledWith(depotId);
    expect(mockLanceleauGateway.findOrionContactByEmail).toHaveBeenCalledWith('user@example.com');
    expect(addNameTagToXml).toHaveBeenCalledWith(originalXml, 'DOE John');

    const expectedXml = `${originalXml}<!-- added DOE John -->`;
    expect(mockAgentVerseauClient.send).toHaveBeenNthCalledWith(1, Buffer.from(expectedXml), 'depot-1_test.xml');
    expect(mockAgentVerseauClient.send).toHaveBeenNthCalledWith(2, Buffer.alloc(0), 'depot-1_test.xml.ack');

    expect(workflow.completeSftpTransfer).toHaveBeenCalledWith(depotId);
  });

  it('keeps the original remote filename when the S3 path uses an opaque deposit key', async () => {
    (mockDepotService.findDepotByIdWithUser as jest.Mock).mockResolvedValue({
      id: 'dep_1',
      path: 'depots/dep_1/file.xml',
      nomOriginalFichier: 'données été.xml',
      userId: 'user-1',
      user: { email: 'user@example.com' },
    });

    await service.process({ depotId: 'dep_1', filePath: 'depots/dep_1/file.xml' });

    expect(mockS3.download).toHaveBeenCalledWith('depots/dep_1/file.xml');
    expect(mockAgentVerseauClient.send).toHaveBeenNthCalledWith(1, expect.any(Buffer), 'dep_1_données été.xml');
    expect(mockAgentVerseauClient.send).toHaveBeenNthCalledWith(2, Buffer.alloc(0), 'dep_1_données été.xml.ack');
  });

  it('should fail without sending files if no user is found', async () => {
    const depotId = 'depot-1';
    const filePath = 's3/path.xml';
    const originalXml = '<xml></xml>';
    (mockDepotService.findDepotByIdWithUser as jest.Mock).mockResolvedValue({
      id: 'depot-1',
      path: 'remote/path.xml',
      user: null,
    });
    (mockS3.download as jest.Mock).mockResolvedValue(Buffer.from(originalXml));

    await expect(service.process({ depotId, filePath })).rejects.toThrow(
      'Depot with id depot-1 has no associated user email',
    );

    expect(addNameTagToXml).not.toHaveBeenCalled();
    expect(mockAgentVerseauClient.send).not.toHaveBeenCalled();
    expect(workflow.failSftpTransfer).toHaveBeenCalledWith(depotId);
  });

  it.each([
    ['missing', null],
    ['without last name', { nom: null, prenom: 'John' }],
    ['without first name', { nom: 'Doe', prenom: null }],
  ])('should fail without sending files when Orion contact is %s', async (_label, contact) => {
    mockLanceleauGateway.findOrionContactByEmail.mockResolvedValue(contact);

    await expect(service.process({ depotId: 'depot-1', filePath: 's3/path.xml' })).rejects.toThrow(
      'Orion contact is missing or incomplete for depot depot-1',
    );

    expect(addNameTagToXml).not.toHaveBeenCalled();
    expect(mockAgentVerseauClient.send).not.toHaveBeenCalled();
    expect(workflow.failSftpTransfer).toHaveBeenCalledWith('depot-1');
  });

  it('should handle errors and update depot status to REJETE', async () => {
    const depotId = 'depot-1';
    const filePath = 's3/path.xml';
    const error = new Error('SFTP Error');
    (mockAgentVerseauClient.send as jest.Mock).mockRejectedValue(error);

    await expect(service.process({ depotId, filePath })).rejects.toThrow('SFTP Error');

    expect(workflow.failSftpTransfer).toHaveBeenCalledWith(depotId);
  });

  it('ignores late or replayed jobs when the depot is no longer awaiting SFTP', async () => {
    workflow.startSftpTransfer.mockResolvedValue(false);
    await service.process({ depotId: 'depot-1', filePath: 's3/path.xml' });
    expect(mockDepotService.findDepotByIdWithUser).not.toHaveBeenCalled();
    expect(mockAgentVerseauClient.send).not.toHaveBeenCalled();
  });
});
