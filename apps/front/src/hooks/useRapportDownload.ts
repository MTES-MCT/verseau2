import { useState } from 'react';
import { downloadRapport } from '../api/depot';

export function useRapportDownload() {
  const [downloadingDepotId, setDownloadingDepotId] = useState<string | null>(null);

  const handleDownload = async (depotId: string) => {
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
    } catch (error) {
      console.error('Error downloading rapport:', error);
      alert('Erreur lors du téléchargement du rapport');
    } finally {
      setDownloadingDepotId(null);
    }
  };

  return {
    downloadingDepotId,
    handleDownload,
  };
}
