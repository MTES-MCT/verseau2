import { useState } from 'react';
import { downloadRapport, downloadXml, downloadAdminRapport, downloadAdminXml } from '../api/depot';
import { triggerFileDownload } from '../helper/fileDownload';

export function useRapportAndXmlDownload(isAdmin = false) {
  const [downloadingDepotId, setDownloadingDepotId] = useState<string | null>(null);
  const [downloadingXmlId, setDownloadingXmlId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async (depotId: string) => {
    setDownloadError(null);
    try {
      setDownloadingDepotId(depotId);
      const blob = isAdmin ? await downloadAdminRapport(depotId) : await downloadRapport(depotId);
      triggerFileDownload(blob, `rapport-${depotId}.pdf`);
    } catch {
      setDownloadError(`Erreur lors du téléchargement du rapport pour le dépôt: ${depotId}  `);
    } finally {
      setDownloadingDepotId(null);
    }
  };

  const handleDownloadXml = async (depotId: string, fileName?: string) => {
    setDownloadError(null);
    try {
      setDownloadingXmlId(depotId);
      const blob = isAdmin ? await downloadAdminXml(depotId) : await downloadXml(depotId);
      triggerFileDownload(blob, fileName || `depot-${depotId}.xml`);
    } catch {
      setDownloadError(`Erreur lors du téléchargement du fichier XML pour le dépôt: ${depotId}  `);
    } finally {
      setDownloadingXmlId(null);
    }
  };

  return {
    downloadingDepotId,
    handleDownload,
    downloadingXmlId,
    handleDownloadXml,
    downloadError,
    setDownloadError,
  };
}
