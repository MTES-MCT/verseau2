export interface AgenceEauSftpRemotePaths {
  zipPath: string;
  ackPath: string;
}

const FAMILY_WITH_STANDARD_PREFIX = new Set(['SEINE-NORMANDIE', 'RHONE-MEDITERRANEE', 'ADOUR-GARONNE']);
const FAMILY_WITH_DEPOT_PREFIX = new Set(['RHIN-MEUSE', 'LOIRE-BRETAGNE']);

function normalizeAgenceEauNom(agenceEauNom: string): string {
  return agenceEauNom
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*-\s*/g, '-')
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

  if (FAMILY_WITH_STANDARD_PREFIX.has(normalizedAgenceEauNom)) {
    return {
      zipPath: `${nomOriginalFichier}.zip`,
      ackPath: `${nomOriginalFichier}.zip.ack`,
    };
  }

  if (FAMILY_WITH_DEPOT_PREFIX.has(normalizedAgenceEauNom)) {
    const numeroDepot = numeroDepotVerseau1?.trim();
    if (!numeroDepot) {
      return null;
    }

    const prefixedNomOriginalFichier = `DEPOT${numeroDepot}_${nomOriginalFichier}`;

    return {
      zipPath: `${prefixedNomOriginalFichier}.zip`,
      ackPath: `ACK_${prefixedNomOriginalFichier}.zip`,
    };
  }

  return null;
}
