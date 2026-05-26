import { Sftp } from './sftp';

/**
 * Registry pour gérer plusieurs clients SFTP pour les différentes agences de l'eau.
 * Les clés de configuration attendues sont les SIRETs des agences.
 */
export interface SftpAgency {
  /**
   * Récupère un client SFTP pour une agence donnée.
   * @param agenceEauSiret SIRET de l'agence de l'eau
   * @returns Client SFTP configuré pour cette agence
   * @throws Error si l'agence n'est pas configurée
   */
  getClient(agenceEauSiret: string): Sftp;

  /**
   * Vérifie si une agence est configurée.
   * @param agenceEauSiret SIRET de l'agence de l'eau
   * @returns true si l'agence est configurée, false sinon
   */
  hasClient(agenceEauSiret: string): boolean;

  /**
   * Retourne la liste des SIRETs d'agences configurés.
   * @returns Liste des SIRETs d'agences
   */
  getConfiguredAgencies(): string[];
}

export const SftpAgency = Symbol('SftpAgency');
