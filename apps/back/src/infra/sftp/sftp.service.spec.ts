import Client from 'ssh2-sftp-client';
import { SftpService } from './sftp.service';
import { LoggerServiceMock } from '@shared/logger/logger.mock';

describe('SftpService', () => {
  const file = Buffer.from('file-content');

  function createSftpClient(): jest.Mocked<Pick<Client, 'connect' | 'mkdir' | 'put' | 'end'>> {
    return {
      connect: jest.fn().mockResolvedValue(undefined),
      mkdir: jest.fn().mockResolvedValue(undefined),
      put: jest.fn().mockResolvedValue(undefined),
      end: jest.fn().mockResolvedValue(undefined),
    };
  }

  it('should upload rejected files to rejectionRemotePath when configured', async () => {
    const sftpClient = createSftpClient();
    const service = new SftpService(
      sftpClient as unknown as Client,
      {
        host: 'localhost',
        port: 22,
        username: 'user',
        privateKey: 'key',
        remotePath: 'uploads',
        rejectionRemotePath: 'rejets',
      },
      new LoggerServiceMock(),
    );

    await service.sendRejection(file, 'dep_1/depot.xml');

    expect(sftpClient.mkdir).toHaveBeenCalledWith('rejets/dep_1', true);
    expect(sftpClient.put).toHaveBeenCalledWith(file, 'rejets/dep_1/depot.xml');
  });

  it('should upload rejected files to remotePath when rejectionRemotePath is not configured', async () => {
    const sftpClient = createSftpClient();
    const service = new SftpService(
      sftpClient as unknown as Client,
      {
        host: 'localhost',
        port: 22,
        username: 'user',
        privateKey: 'key',
        remotePath: 'uploads',
      },
      new LoggerServiceMock(),
    );

    await service.sendRejection(file, 'dep_1/depot.xml');

    expect(sftpClient.mkdir).toHaveBeenCalledWith('uploads/dep_1', true);
    expect(sftpClient.put).toHaveBeenCalledWith(file, 'uploads/dep_1/depot.xml');
  });
});
