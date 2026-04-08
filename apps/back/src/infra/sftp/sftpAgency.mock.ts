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

  // Liste des agences mockées par défaut
  private readonly defaultAgencies = ['agence_01', 'agence_02', 'agence_03', 'agence_04', 'agence_05', 'agence_06'];

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(SftpAgencyMock.name);
    this.mockClient = new SftpProviderMock(this.logger);
    this.logger.log(`[MOCK] SftpAgency initialisé with ${this.defaultAgencies.length} agences mockées`);
  }

  getClient(agencyId: string): Sftp {
    this.logger.log(`[MOCK] Récupération du client SFTP pour l'agence: ${agencyId}`);
    // Retourne toujours le même mock client pour toutes les agences
    return this.mockClient;
  }

  hasClient(_agencyId: string): boolean {
    // En mode mock, on accepte toutes les agences par défaut
    return true;
  }

  getConfiguredAgencies(): string[] {
    return [...this.defaultAgencies];
  }
}
