import type { TypePointMesureValue } from '@lib/dossier';

/** Codes de localisation réglementaires (A1 à A8) */
const LOCALISATION_CODES_REGLEMENTAIRE = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8'];

/** Codes de localisation logiques (R1, S1 à S17) */
const LOCALISATION_CODES_LOGIQUE = [
  'R1',
  'S1',
  'S2',
  'S3',
  'S4',
  'S5',
  'S6',
  'S7',
  'S8',
  'S9',
  'S10',
  'S11',
  'S12',
  'S13',
  'S14',
  'S15',
  'S16',
  'S17',
];

/**
 * Traduit un TypePointMesure en codes de localisation explicites exploitables par l'infra (SQL IN / REST query param).
 * Retourne undefined quand aucun filtre n'est nécessaire (tous).
 */
export function toLocalisationCodes(type: TypePointMesureValue): string[] | undefined {
  switch (type) {
    case 'reglementaire':
      return LOCALISATION_CODES_REGLEMENTAIRE;
    case 'logique':
      return LOCALISATION_CODES_LOGIQUE;
    case 'tous':
      return undefined;
  }
}
