import Client from 'ssh2-sftp-client';
import { SftpService } from './sftp.service';
import { LoggerService } from '@shared/logger/logger.service';
import { loggerValueMock } from '@shared/logger/logger.mock';
import { decodeSftpPrivateKey } from './sftp-private-key';

describe('sftp private key', () => {
  it('should reject invalid SFTP_PRIVATE_KEY values with ssh2 parser', () => {
    const invalidPrivateKey = Buffer.from('not a private key', 'utf8').toString('base64');

    expect(() => decodeSftpPrivateKey(invalidPrivateKey)).toThrow(/Invalid SFTP_PRIVATE_KEY: Unsupported key format/);
  });
});

describe('SftpService', () => {
  it('should connect with password when configured with password credentials', async () => {
    const connect = jest.fn().mockResolvedValue(undefined);
    const put = jest.fn().mockResolvedValue(undefined);
    const end = jest.fn().mockResolvedValue(undefined);
    const file = Buffer.from('file-content');
    const client = {
      connect,
      put,
      end,
      mkdir: jest.fn().mockResolvedValue(undefined),
    } as unknown as Client;

    const service = new SftpService(
      client,
      {
        host: 'sftp.example.com',
        port: 22,
        username: 'agency-user',
        password: 'agency-password',
      },
      loggerValueMock as unknown as LoggerService,
    );

    await service.send(file, 'report.pdf');

    expect(connect).toHaveBeenCalledWith({
      host: 'sftp.example.com',
      port: 22,
      username: 'agency-user',
      password: 'agency-password',
    });
    expect(connect.mock.calls[0][0]).not.toHaveProperty('privateKey');
    expect(put).toHaveBeenCalledWith(file, 'report.pdf');
    expect(end).toHaveBeenCalledTimes(1);
  });
});
