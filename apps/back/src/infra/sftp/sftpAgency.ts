import { Sftp } from './sftp';

/**
 * Registry pour gérer plusieurs clients SFTP pour les différentes agences de l'eau.
 * Permet de récupérer un client SFTP configuré pour une agence spécifique.
 */
export interface SftpAgency {
  /**
   * Récupère un client SFTP pour une agence donnée.
   * @param agencyId Identifiant de l'agence de l'eau
   * @returns Client SFTP configuré pour cette agence
   * @throws Error si l'agence n'est pas configurée
   */
  getClient(agencyId: string): Sftp;

  /**
   * Vérifie si une agence est configurée.
   * @param agencyId Identifiant de l'agence de l'eau
   * @returns true si l'agence est configurée, false sinon
   */
  hasClient(agencyId: string): boolean;

  /**
   * Retourne la liste des identifiants d'agences configurées.
   * @returns Liste des IDs d'agences
   */
  getConfiguredAgencies(): string[];
}

export const SftpAgency = Symbol('SftpAgency');
