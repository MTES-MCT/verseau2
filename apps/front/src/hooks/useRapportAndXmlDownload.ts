import { useState } from 'react';
import { downloadRapport, downloadXml } from '../api/depot';

export function useRapportAndXmlDownload() {
  const [downloadingDepotId, setDownloadingDepotId] = useState<string | null>(null);
  const [downloadingXmlId, setDownloadingXmlId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async (depotId: string) => {
    setDownloadError(null);
    try {
      setDownloadingDepotId(depotId);
      const blob = await downloadRapport(depotId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-${depotId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
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
      const blob = await downloadXml(depotId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || `depot-${depotId}.xml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
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
