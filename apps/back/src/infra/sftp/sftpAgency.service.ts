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
  remotePath?: string;
}

/**
 * Format attendu de la variable d'environnement SFTP_AGENCY_CONFIG.
 * Exemple: {"11111111111111": {"host": "sftp1.example.com", "port": 22, "username": "user1"}}
 */
export type SftpAgenciesConfig = Record<string, SftpAgencyConfig>;

@Injectable()
export class SftpAgencyService implements SftpAgency {
  readonly clients: Map<string, Sftp> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(SftpAgencyService.name);
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

      for (const [agenceEauSiret, config] of Object.entries(agenciesConfig)) {
        const privateKey = this.getPrivateKey(agenceEauSiret);
        this.validateConfig(agenceEauSiret, { ...config, privateKey });

        const sftpClient = new Client();
        const sftpService = new SftpService(
          sftpClient,
          {
            host: config.host,
            port: config.port,
            username: config.username,
            privateKey,
            remotePath: config.remotePath,
          },
          this.logger,
        );

        this.clients.set(agenceEauSiret, sftpService);
        this.logger.log(`Client SFTP configuré pour l'agence: ${agenceEauSiret}`);
      }

      this.logger.log(`${this.clients.size} client(s) SFTP agence(s) configuré(s)`);
    } catch (error) {
      this.logger.error('Erreur lors du parsing de SFTP_AGENCY_CONFIG', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Configuration SFTP invalide: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getPrivateKey(agenceEauSiret: string): string {
    const privateKey = this.configService.get<string>(`SFTP_AGENCY_PRIVATE_KEY_${agenceEauSiret}`);

    if (!privateKey) {
      throw new Error(`Configuration incomplète pour l'agence ${agenceEauSiret}: privateKey manquant`);
    }

    const decodedKey = Buffer.from(privateKey, 'base64').toString('utf8');
    return decodedKey;
  }

  private validateConfig(agenceEauSiret: string, config: unknown): asserts config is SftpAgencyConfig {
    if (!config || typeof config !== 'object') {
      throw new Error(`Configuration invalide pour l'agence ${agenceEauSiret}: doit être un objet`);
    }

    const configObj = config as Record<string, unknown>;
    const requiredFields: (keyof SftpAgencyConfig)[] = ['host', 'port', 'username'];

    for (const field of requiredFields) {
      if (!configObj[field]) {
        throw new Error(`Configuration incomplète pour l'agence ${agenceEauSiret}: ${field} manquant`);
      }
    }

    if (typeof configObj.port !== 'number') {
      throw new Error(`Port invalide pour l'agence ${agenceEauSiret}: doit être un nombre`);
    }
  }

  getClient(agenceEauSiret: string): Sftp {
    const client = this.clients.get(agenceEauSiret);

    if (!client) {
      throw new Error(
        `Aucun client SFTP configuré pour l'agence: ${agenceEauSiret}. ` +
          `Agences disponibles: ${Array.from(this.clients.keys()).join(', ')}`,
      );
    }

    return client;
  }

  hasClient(agenceEauSiret: string): boolean {
    return this.clients.has(agenceEauSiret);
  }

  getConfiguredAgencies(): string[] {
    return Array.from(this.clients.keys());
  }
}
