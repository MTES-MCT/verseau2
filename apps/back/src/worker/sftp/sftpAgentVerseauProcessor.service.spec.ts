/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { SftpAgentVerseauProcessorService } from './sftpAgentVerseauProcessor.service';
import { Sftp } from '@infra/sftp/sftp';
import { S3 } from '@s3/s3';
import { DepotService } from '@dossier/depot/depot.service';
import { LoggerService } from '@shared/logger/logger.service';
import { DepotStatus, DepotStep, EtapeMetier } from '@lib/dossier';
import { addNameTagToXml } from '@lib/parser';

jest.mock('@lib/parser', () => ({
  addNameTagToXml: jest.fn((xml, name) => `${xml}<!-- added ${name} -->`),
}));

describe('SftpAgentVerseauProcessorService', () => {
  let service: SftpAgentVerseauProcessorService;
  let mockSftp: Sftp;
  let mockS3: S3;
  let mockDepotService: DepotService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSftp = {
      send: jest.fn().mockResolvedValue(undefined),
      sendRejection: jest.fn().mockResolvedValue(undefined),
      sendToAgentVerseau: jest.fn().mockResolvedValue(undefined),
    } as unknown as Sftp;

    mockS3 = {
      download: jest.fn().mockResolvedValue(Buffer.from('<xml></xml>')),
    } as unknown as S3;

    mockDepotService = {
      update: jest.fn().mockResolvedValue({}),
      findDepotByIdWithUser: jest.fn().mockResolvedValue({
        id: 'depot-1',
        path: 'remote/path.xml',
        user: { nom: 'Doe', prenom: 'John' },
      }),
    } as unknown as DepotService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SftpAgentVerseauProcessorService,
        { provide: Sftp, useValue: mockSftp },
        { provide: S3, useValue: mockS3 },
        { provide: DepotService, useValue: mockDepotService },
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

    expect(mockDepotService.update).toHaveBeenCalledWith(depotId, {
      status: DepotStatus.EN_COURS_DE_TRAITEMENT,
      step: DepotStep.SFTP_IN_PROGRESS,
      etapeMetier: EtapeMetier.FINALISATION_IMPORT,
    });

    expect(mockDepotService.findDepotByIdWithUser).toHaveBeenCalledWith(depotId);
    expect(addNameTagToXml).toHaveBeenCalledWith(originalXml, 'John Doe');

    const expectedXml = `${originalXml}<!-- added John Doe -->`;
    expect(mockSftp.sendToAgentVerseau).toHaveBeenNthCalledWith(1, Buffer.from(expectedXml), 'remote/path.xml');
    expect(mockSftp.sendToAgentVerseau).toHaveBeenNthCalledWith(2, Buffer.alloc(0), 'remote/path.xml.ack');

    expect(mockDepotService.update).toHaveBeenCalledWith(depotId, {
      step: DepotStep.SFTP_COMPLETED,
    });
  });

  it('should send original file if no user is found', async () => {
    const depotId = 'depot-1';
    const filePath = 's3/path.xml';
    const originalXml = '<xml></xml>';
    (mockDepotService.findDepotByIdWithUser as jest.Mock).mockResolvedValue({
      id: 'depot-1',
      path: 'remote/path.xml',
      user: null,
    });
    (mockS3.download as jest.Mock).mockResolvedValue(Buffer.from(originalXml));

    await service.process({ depotId, filePath });

    expect(addNameTagToXml).not.toHaveBeenCalled();
    expect(mockSftp.sendToAgentVerseau).toHaveBeenNthCalledWith(1, Buffer.from(originalXml), 'remote/path.xml');
    expect(mockSftp.sendToAgentVerseau).toHaveBeenNthCalledWith(2, Buffer.alloc(0), 'remote/path.xml.ack');
  });

  it('should handle errors and update depot status to REJETE', async () => {
    const depotId = 'depot-1';
    const filePath = 's3/path.xml';
    const error = new Error('SFTP Error');
    (mockSftp.sendToAgentVerseau as jest.Mock).mockRejectedValue(error);

    await expect(service.process({ depotId, filePath })).rejects.toThrow('SFTP Error');

    expect(mockDepotService.update).toHaveBeenCalledWith(depotId, {
      status: DepotStatus.REJETE,
      step: DepotStep.SFTP_FAILED,
    });
  });
});
