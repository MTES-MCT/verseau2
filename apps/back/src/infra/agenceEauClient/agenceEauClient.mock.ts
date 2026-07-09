import { Injectable } from '@nestjs/common';
import { AgenceEauClient } from './agenceEauClient';
import { TransferClient } from '../transferClient/transferClient';
import { TransferClientMock } from '../transferClient/transferClient.mock';
import { LoggerService } from '@shared/logger/logger.service';

/**
 * Mock du registre de transfert pour les tests et le développement local.
 * Retourne une instance de TransferClientMock pour toutes les agences.
 */
@Injectable()
export class AgenceEauClientMock implements AgenceEauClient {
  private readonly mockClient: TransferClient;

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
    this.logger.setContext(AgenceEauClientMock.name);
    this.mockClient = new TransferClientMock(this.logger);
    this.logger.warn(`[MOCK] AgenceEauClient initialisé with ${this.defaultAgencies.length} agences mockées`);
  }

  getClient(cdbRfa: string): TransferClient {
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
