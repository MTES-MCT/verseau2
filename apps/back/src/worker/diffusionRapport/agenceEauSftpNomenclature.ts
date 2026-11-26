export interface AgenceEauSftpRemotePaths {
  zipPath: string;
  ackPath: string;
}

const ACK_SUFFIX_AGENCIES = new Set(['SEINE-NORMANDIE', 'RHONE-MEDITERRANEE', 'ADOUR-GARONNE']);
const ACK_PREFIX_AGENCIES = new Set(['RHIN-MEUSE', 'LOIRE-BRETAGNE', 'ARTOIS-PICARDIE']);
const SUPPORTED_AGENCIES = new Set([...ACK_SUFFIX_AGENCIES, ...ACK_PREFIX_AGENCIES]);

function normalizeAgenceEauNom(agenceEauNom: string): string {
  return agenceEauNom
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*-\s*/g, '-')
    .replace('_', '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function buildAgenceEauSftpRemotePaths(
  agenceEauNom: string,
  nomOriginalFichier: string,
  numeroDepotVerseau1?: string | null,
): AgenceEauSftpRemotePaths | null {
  const normalizedAgenceEauNom = normalizeAgenceEauNom(agenceEauNom);

  if (!SUPPORTED_AGENCIES.has(normalizedAgenceEauNom)) {
    return null;
  }

  const numeroDepot = numeroDepotVerseau1?.trim();
  if (!numeroDepot) {
    return null;
  }

  const prefixedNomOriginalFichier = `TEST_DEPOT${numeroDepot}_${nomOriginalFichier}`;

  if (ACK_PREFIX_AGENCIES.has(normalizedAgenceEauNom)) {
    return {
      zipPath: `${prefixedNomOriginalFichier}.TEST`,
      ackPath: `ACK_${prefixedNomOriginalFichier}.TEST`,
    };
  }

  return {
    zipPath: `${prefixedNomOriginalFichier}.TEST`,
    ackPath: `${prefixedNomOriginalFichier}.ack.TEST`,
  };
}
