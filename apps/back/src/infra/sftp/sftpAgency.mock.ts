import { Injectable } from '@nestjs/common';
import { SftpAgency } from './sftpAgency';
import { Sftp } from './sftp';
import { SftpProviderMock } from './sftp.provider.mock';
import { LoggerService } from '@shared/logger/logger.service';

/**
 * Mock du registre SFTP pour les tests et le développement local.
 * Retourne des instances de SftpProviderMock pour toutes les agences.
 */
@Injectable()
export class SftpAgencyMock implements SftpAgency {
  private readonly mockClient: Sftp;

  // Liste d'exemple de codes CDB d'agences mockés par défaut
  private readonly defaultAgencies = [
    '11111111111111',
    '22222222222222',
    '33333333333333',
    '44444444444444',
    '55555555555555',
    '66666666666666',
  ];

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(SftpAgencyMock.name);
    this.mockClient = new SftpProviderMock(this.logger);
    this.logger.warn(`[MOCK] SftpAgency initialisé with ${this.defaultAgencies.length} agences mockées`);
  }

  getClient(cdbRfa: string): Sftp {
    this.logger.warn(`[MOCK] Récupération du client SFTP pour le code CDB: ${cdbRfa}`);
    // Retourne toujours le même mock client pour toutes les agences
    return this.mockClient;
  }

  hasClient(_cdbRfa: string): boolean {
    // En mode mock, on accepte toutes les agences par défaut
    return true;
  }

  getConfiguredAgencies(): string[] {
    return [...this.defaultAgencies];
  }
}
