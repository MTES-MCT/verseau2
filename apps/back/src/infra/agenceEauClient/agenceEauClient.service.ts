import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as FtpClient } from 'basic-ftp';
import Client from 'ssh2-sftp-client';
import { AgenceEauClient } from './agenceEauClient';
import { TransferClient } from '../transferClient/transferClient';
import { FtpService } from '../ftp/ftp.service';
import { SftpCredentials, SftpService } from '../sftp/sftp.service';
import { decodeSftpPrivateKey } from '../sftp/sftp-private-key';
import { LoggerService } from '@shared/logger/logger.service';

/**
 * Configuration pour une agence de l'eau.
 */
export interface AgenceEauClientConfig {
  type?: 'sftp' | 'ftp';
  host: string;
  port: number;
  username: string;
  remotePath?: string;
  secure?: boolean | 'implicit';
}

/**
 * Format attendu de la variable d'environnement SFTP_AGENCY_CONFIG.
 * Exemple: {"11111111111111": {"host": "sftp1.example.com", "port": 22, "username": "user1"}}
 */
export type AgencesEauClientConfig = Record<string, AgenceEauClientConfig>;

@Injectable()
export class AgenceEauClientService implements AgenceEauClient {
  readonly clients: Map<string, TransferClient> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(AgenceEauClientService.name);
    this.initializeClients();
  }

  private initializeClients(): void {
    const configJson = this.configService.get<string>('SFTP_AGENCY_CONFIG');

    if (!configJson) {
      this.logger.warn('SFTP_AGENCY_CONFIG non définie, aucun client SFTP agence configuré');
      return;
    }

    try {
      const agenciesConfig = JSON.parse(configJson) as AgencesEauClientConfig;

      for (const [agenceEauNom, config] of Object.entries(agenciesConfig)) {
        const agenceEnvKey = this.getAgencyEnvKey(agenceEauNom);
        this.validateConfig(agenceEauNom, config);
        const client = this.createClient(agenceEauNom, config);

        this.clients.set(agenceEnvKey, client);
        this.logger.log(`Client ${config.type ?? 'sftp'} configuré pour l'agence: ${agenceEauNom}`);
      }

      this.logger.log(`${this.clients.size} client(s) agence(s) configuré(s)`);
      this.logger.log(`Agences configurées: ${Array.from(this.clients.keys()).join(', ')}`);
    } catch (error) {
      this.logger.error('Erreur lors du parsing de SFTP_AGENCY_CONFIG', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Configuration SFTP invalide: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private createClient(agenceEauNom: string, config: AgenceEauClientConfig): TransferClient {
    if (config.type === 'ftp') {
      return new FtpService(
        new FtpClient(),
        {
          host: config.host,
          port: config.port,
          username: config.username,
          remotePath: config.remotePath,
          secure: config.secure,
          password: this.getFtpPassword(agenceEauNom),
        },
        this.logger,
      );
    }

    const sftpClient = new Client();
    return new SftpService(
      sftpClient,
      {
        host: config.host,
        port: config.port,
        username: config.username,
        remotePath: config.remotePath,
        ...this.getSftpCredentials(agenceEauNom),
      },
      this.logger,
    );
  }

  private getSftpCredentials(agenceEauNom: string): SftpCredentials {
    const agenceEnvKey = this.getAgencyEnvKey(agenceEauNom);
    const privateKeyConfigKey = `SFTP_AGENCY_PRIVATE_KEY_${agenceEnvKey}`;
    const privateKey = this.configService.get<string>(privateKeyConfigKey);

    if (privateKey) {
      return {
        privateKey: decodeSftpPrivateKey(privateKey, privateKeyConfigKey),
      };
    }

    const password = this.configService.get<string>(`SFTP_AGENCY_PASSWORD_${agenceEnvKey}`);

    if (password) {
      return { password };
    }

    throw new Error(`Configuration incomplète pour l'agence ${agenceEauNom}: privateKey ou password manquant`);
  }

  private getFtpPassword(agenceEauNom: string): string {
    const agenceEnvKey = this.getAgencyEnvKey(agenceEauNom);
    const password = this.configService.get<string>(`SFTP_AGENCY_PASSWORD_${agenceEnvKey}`);

    if (!password) {
      throw new Error(`Configuration incomplète pour l'agence ${agenceEauNom}: password manquant pour FTP`);
    }

    return password;
  }

  private validateConfig(agenceEauNom: string, config: unknown): asserts config is AgenceEauClientConfig {
    if (!config || typeof config !== 'object') {
      throw new Error(`Configuration invalide pour l'agence ${agenceEauNom}: doit être un objet`);
    }

    const configObj = config as Record<string, unknown>;
    const requiredFields: (keyof AgenceEauClientConfig)[] = ['host', 'port', 'username'];

    for (const field of requiredFields) {
      if (!configObj[field]) {
        throw new Error(`Configuration incomplète pour l'agence ${agenceEauNom}: ${field} manquant`);
      }
    }

    if (typeof configObj.port !== 'number') {
      throw new Error(`Port invalide pour l'agence ${agenceEauNom}: doit être un nombre`);
    }

    if (configObj.type && configObj.type !== 'sftp' && configObj.type !== 'ftp') {
      throw new Error(`Type invalide pour l'agence ${agenceEauNom}: doit être "sftp" ou "ftp"`);
    }

    if (configObj.secure !== undefined && typeof configObj.secure !== 'boolean' && configObj.secure !== 'implicit') {
      throw new Error(`Secure invalide pour l'agence ${agenceEauNom}: doit être un booléen ou "implicit"`);
    }
  }

  getClient(nomAgence: string): TransferClient {
    const agenceEnvKey = this.getAgencyEnvKey(nomAgence);
    const client = this.clients.get(agenceEnvKey);

    if (!client) {
      throw new Error(
        `Aucun client SFTP configuré pour le code CDB: ${nomAgence}. ` +
          `Agences disponibles: ${Array.from(this.clients.keys()).join(', ')}`,
      );
    }

    return client;
  }

  hasClient(nomAgence: string): boolean {
    return this.clients.has(this.getAgencyEnvKey(nomAgence));
  }

  getConfiguredAgencies(): string[] {
    return Array.from(this.clients.keys());
  }

  private getAgencyEnvKey(nomAgence: string): string {
    return nomAgence.replaceAll('-', '_');
  }
}
