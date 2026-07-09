import { utils } from 'ssh2';

export const validateSftpPrivateKey = (privateKey: string, configKey = 'SFTP_PRIVATE_KEY'): void => {
  const parsedKey = utils.parseKey(privateKey);

  if (parsedKey instanceof Error) {
    throw new Error(`Invalid ${configKey}: ${parsedKey.message}`);
  }

  if (parsedKey.getPrivatePEM() === null) {
    throw new Error(`Invalid ${configKey}: expected a private key`);
  }
};

export const decodeSftpPrivateKey = (privateKey: string, configKey = 'SFTP_PRIVATE_KEY'): string => {
  const decodedPrivateKey = Buffer.from(privateKey, 'base64').toString('utf8');
  validateSftpPrivateKey(decodedPrivateKey, configKey);
  return decodedPrivateKey;
};
