import { Client as FtpClient } from 'basic-ftp';
import { FtpService } from './ftp.service';
import { LoggerService } from '@shared/logger/logger.service';
import { loggerValueMock } from '@shared/logger/logger.mock';

describe('FtpService', () => {
  it('should connect and upload with basic-ftp when configured with password credentials', async () => {
    const access = jest.fn().mockResolvedValue(undefined);
    const ensureDir = jest.fn().mockResolvedValue(undefined);
    const uploadFrom = jest.fn().mockResolvedValue(undefined);
    const close = jest.fn();
    const file = Buffer.from('file-content');
    const client = {
      access,
      ensureDir,
      uploadFrom,
      close,
    } as unknown as FtpClient;

    const service = new FtpService(
      client,
      {
        host: 'ftp.example.com',
        port: 21,
        username: 'agency-user',
        password: 'agency-password',
        remotePath: 'agency-root',
        secure: 'implicit',
      },
      loggerValueMock as unknown as LoggerService,
    );

    await service.send(file, 'reports/report.pdf');

    expect(access).toHaveBeenCalledWith({
      host: 'ftp.example.com',
      port: 21,
      user: 'agency-user',
      password: 'agency-password',
      secure: 'implicit',
    });
    expect(ensureDir).toHaveBeenCalledWith('agency-root/reports');
    expect(uploadFrom).toHaveBeenCalledWith(expect.anything(), 'report.pdf');
    expect(close).toHaveBeenCalledTimes(1);
  });
});
