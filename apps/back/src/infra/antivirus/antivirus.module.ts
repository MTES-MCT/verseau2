import { Module } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AntivirusGateway } from './antivirus.gateway';
import { isAntivirusBypassed, resolveAntivirusConfig } from './antivirus.config';
import { HttpAntivirusGateway } from './antivirus.http';
import { AntivirusProtocolError } from './antivirus.errors';

export function createAntivirusGateway(config: ConfigService): AntivirusGateway {
  const provider = config.get<string>('ANTIVIRUS_PROVIDER') ?? 'http';
  if (provider !== 'http') {
    throw new Error('ANTIVIRUS_PROVIDER must be http; mock adapters are only available through DI overrides');
  }
  const bypassed = isAntivirusBypassed(config);
  if (
    bypassed ||
    (config.get<string>('NODE_ENV') !== 'production' &&
      !config.get<string>('ANTIVIRUS_URL') &&
      !config.get<string>('ANTIVIRUS_TOKEN'))
  ) {
    // Bypass is persisted by the processor, never disguised as a clean scan.
    const code = bypassed ? 'SCANNER_BYPASSED' : 'SCANNER_NOT_CONFIGURED';
    return {
      scanStream: (stream) => {
        stream.destroy();
        return Promise.reject(new AntivirusProtocolError(code, null));
      },
      scan: (buffer: Buffer) =>
        Promise.reject(new AntivirusProtocolError(code, createHash('sha256').update(buffer).digest('hex'))),
    };
  }
  return new HttpAntivirusGateway(resolveAntivirusConfig(config));
}

@Module({
  imports: [ConfigModule],
  providers: [{ provide: AntivirusGateway, inject: [ConfigService], useFactory: createAntivirusGateway }],
  exports: [AntivirusGateway],
})
export class AntivirusModule {}
