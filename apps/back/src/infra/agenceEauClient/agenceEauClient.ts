import { TransferClient } from '../transferClient/transferClient';

export interface AgenceEauClient {
  /**
   * Récupère un client de transfert pour une agence donnée.
   * @param cdbRfa Code CDB de l'agence de l'eau
   * @returns Client de transfert configuré pour cette agence
   * @throws Error si l'agence n'est pas configurée
   */
  getClient(cdbRfa: string): TransferClient;

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

export const AgenceEauClient = Symbol('AgenceEauClient');
