import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Client from 'ssh2-sftp-client';
import { SftpAgency } from './sftpAgency';
import { Sftp } from './sftp';
import { SftpService } from './sftp.service';
import { LoggerService } from '@shared/logger/logger.service';

/**
 * Configuration pour une agence de l'eau.
 */
export interface SftpAgencyConfig {
  host: string;
  port: number;
  username: string;
  privateKey: string;
}

/**
 * Format attendu de la variable d'environnement SFTP_AGENCY_CONFIG.
 * Exemple: {"agence_01": {"host": "sftp1.example.com", "port": 22, "username": "user1", "privateKey": "..."}}
 */
export type SftpAgenciesConfig = Record<string, SftpAgencyConfig>;

@Injectable()
export class SftpAgencyService implements SftpAgency {
  private readonly logger = new LoggerService(SftpAgencyService.name);
  private readonly clients: Map<string, Sftp> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.initializeClients();
  }

  private initializeClients(): void {
    const configJson = this.configService.get<string>('SFTP_AGENCY_CONFIG');

    if (!configJson) {
      this.logger.warn('SFTP_AGENCY_CONFIG non définie, aucun client SFTP agence configuré');
      return;
    }

    try {
      const agenciesConfig = JSON.parse(configJson) as SftpAgenciesConfig;

      for (const [agencyId, config] of Object.entries(agenciesConfig)) {
        this.validateConfig(agencyId, config);

        const sftpClient = new Client();
        const sftpService = new SftpService(
          sftpClient,
          {
            host: config.host,
            port: config.port,
            username: config.username,
            privateKey: config.privateKey,
          },
          this.logger,
        );

        this.clients.set(agencyId, sftpService);
        this.logger.log(`Client SFTP configuré pour l'agence: ${agencyId}`);
      }

      this.logger.log(`${this.clients.size} client(s) SFTP agence(s) configuré(s)`);
    } catch (error) {
      this.logger.error('Erreur lors du parsing de SFTP_AGENCY_CONFIG', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Configuration SFTP invalide: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private validateConfig(agencyId: string, config: unknown): asserts config is SftpAgencyConfig {
    if (!config || typeof config !== 'object') {
      throw new Error(`Configuration invalide pour l'agence ${agencyId}: doit être un objet`);
    }

    const configObj = config as Record<string, unknown>;
    const requiredFields: (keyof SftpAgencyConfig)[] = ['host', 'port', 'username', 'privateKey'];

    for (const field of requiredFields) {
      if (!configObj[field]) {
        throw new Error(`Configuration incomplète pour l'agence ${agencyId}: ${field} manquant`);
      }
    }

    if (typeof configObj.port !== 'number') {
      throw new Error(`Port invalide pour l'agence ${agencyId}: doit être un nombre`);
    }
  }

  getClient(agencyId: string): Sftp {
    const client = this.clients.get(agencyId);

    if (!client) {
      throw new Error(
        `Aucun client SFTP configuré pour l'agence: ${agencyId}. ` +
          `Agences disponibles: ${Array.from(this.clients.keys()).join(', ')}`,
      );
    }

    return client;
  }

  hasClient(agencyId: string): boolean {
    return this.clients.has(agencyId);
  }

  getConfiguredAgencies(): string[] {
    return Array.from(this.clients.keys());
  }
}
