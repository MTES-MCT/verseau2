/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { SftpAgentVerseauProcessorService } from './sftpAgentVerseauProcessor.service';
import { AgentVerseauClient } from '@infra/agentVerseauClient/agentVerseauClient';
import { S3 } from '@s3/s3';
import { DepotService } from '@dossier/depot/depot.service';
import { LoggerService } from '@shared/logger/logger.service';
import { DepotStatus, DepotStep, EtapeMetier } from '@lib/dossier';
import { addEmailTagToXml, addNameTagToXml } from '@lib/parser';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';

jest.mock('@lib/parser', () => ({
  addNameTagToXml: jest.fn((xml, name) => `${xml}<!-- added ${name} -->`),
  addEmailTagToXml: jest.fn((xml, email) => `${xml}<!-- added ${email} -->`),
}));

describe('SftpAgentVerseauProcessorService', () => {
  let service: SftpAgentVerseauProcessorService;
  let mockAgentVerseauClient: AgentVerseauClient;
  let mockS3: S3;
  let mockDepotService: DepotService;
  let mockLanceleauGateway: jest.Mocked<LanceleauGateway>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAgentVerseauClient = {
      send: jest.fn().mockResolvedValue(undefined),
    } as unknown as AgentVerseauClient;

    mockS3 = {
      download: jest.fn().mockResolvedValue(Buffer.from('<xml></xml>')),
    } as unknown as S3;

    mockDepotService = {
      update: jest.fn().mockResolvedValue({}),
      findDepotByIdWithUser: jest.fn().mockResolvedValue({
        id: 'depot-1',
        path: 'remote/path.xml',
        userId: 'user-1',
        user: { email: 'user@example.com', nom: 'Cerbere', prenom: 'Contact' },
      }),
    } as unknown as DepotService;

    mockLanceleauGateway = {
      findOrionContactByEmail: jest.fn().mockResolvedValue({ nom: 'Doe', prenom: 'John', email: 'agent@example.com' }),
    } as unknown as jest.Mocked<LanceleauGateway>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SftpAgentVerseauProcessorService,
        { provide: AgentVerseauClient, useValue: mockAgentVerseauClient },
        { provide: S3, useValue: mockS3 },
        { provide: DepotService, useValue: mockDepotService },
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

  it('should download, modify XML with agent contact, and send to SFTP', async () => {
    const depotId = 'depot-1';
    const filePath = 's3/path.xml';
    const originalXml = '<xml></xml>';
    (mockS3.download as jest.Mock).mockResolvedValue(Buffer.from(originalXml));

    await service.process({ depotId, filePath });

    expect(mockDepotService.update).toHaveBeenCalledWith(depotId, {
      status: DepotStatus.EN_COURS_DE_TRAITEMENT,
      step: DepotStep.SFTP_IN_PROGRESS,
      etapeMetier: EtapeMetier.FINALISATION_IMPORT,
    });

    expect(mockDepotService.findDepotByIdWithUser).toHaveBeenCalledWith(depotId);
    expect(mockLanceleauGateway.findOrionContactByEmail).toHaveBeenCalledWith('user@example.com');
    expect(addNameTagToXml).toHaveBeenCalledWith(originalXml, 'DOE John');
    expect(addEmailTagToXml).toHaveBeenCalledWith(`${originalXml}<!-- added DOE John -->`, 'agent@example.com');

    const expectedXml = `${originalXml}<!-- added DOE John --><!-- added agent@example.com -->`;
    expect(mockAgentVerseauClient.send).toHaveBeenNthCalledWith(1, Buffer.from(expectedXml), 'remote/path.xml');
    expect(mockAgentVerseauClient.send).toHaveBeenNthCalledWith(2, Buffer.alloc(0), 'remote/path.xml.ack');

    expect(mockDepotService.update).toHaveBeenCalledWith(depotId, {
      step: DepotStep.SFTP_COMPLETED,
    });
  });

  it('should send the file with NomContact when the agent email is missing', async () => {
    const originalXml = '<xml></xml>';
    mockLanceleauGateway.findOrionContactByEmail.mockResolvedValue({ nom: 'Doe', prenom: 'John', email: null });
    (mockS3.download as jest.Mock).mockResolvedValue(Buffer.from(originalXml));

    await service.process({ depotId: 'depot-1', filePath: 's3/path.xml' });

    expect(addNameTagToXml).toHaveBeenCalledWith(originalXml, 'DOE John');
    expect(addEmailTagToXml).not.toHaveBeenCalled();
    expect(mockAgentVerseauClient.send).toHaveBeenNthCalledWith(
      1,
      Buffer.from(`${originalXml}<!-- added DOE John -->`),
      'remote/path.xml',
    );
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
    expect(addEmailTagToXml).not.toHaveBeenCalled();
    expect(mockAgentVerseauClient.send).not.toHaveBeenCalled();
    expect(mockDepotService.update).toHaveBeenCalledWith(depotId, {
      status: DepotStatus.REJETE,
      step: DepotStep.SFTP_FAILED,
    });
  });

  it.each([
    ['missing', null],
    ['without last name', { nom: null, prenom: 'John', email: 'agent@example.com' }],
    ['without first name', { nom: 'Doe', prenom: null, email: 'agent@example.com' }],
  ])('should fail without sending files when Orion contact is %s', async (_label, contact) => {
    mockLanceleauGateway.findOrionContactByEmail.mockResolvedValue(contact);

    await expect(service.process({ depotId: 'depot-1', filePath: 's3/path.xml' })).rejects.toThrow(
      'Orion contact is missing or incomplete for depot depot-1',
    );

    expect(addNameTagToXml).not.toHaveBeenCalled();
    expect(addEmailTagToXml).not.toHaveBeenCalled();
    expect(mockAgentVerseauClient.send).not.toHaveBeenCalled();
    expect(mockDepotService.update).toHaveBeenCalledWith('depot-1', {
      status: DepotStatus.REJETE,
      step: DepotStep.SFTP_FAILED,
    });
  });

  it('should handle errors and update depot status to REJETE', async () => {
    const depotId = 'depot-1';
    const filePath = 's3/path.xml';
    const error = new Error('SFTP Error');
    (mockAgentVerseauClient.send as jest.Mock).mockRejectedValue(error);

    await expect(service.process({ depotId, filePath })).rejects.toThrow('SFTP Error');

    expect(mockDepotService.update).toHaveBeenCalledWith(depotId, {
      status: DepotStatus.REJETE,
      step: DepotStep.SFTP_FAILED,
    });
  });
});
