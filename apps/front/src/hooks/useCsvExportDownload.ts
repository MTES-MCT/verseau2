import { useState } from 'react';
import type { DownloadedFile } from '../api/apiClient';
import { triggerFileDownload } from '../helper/fileDownload';

export function useCsvExportDownload<TQuery>(downloadFile: (query: TQuery) => Promise<DownloadedFile>) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async (query: TQuery, fallbackFilename: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const file = await downloadFile(query);
      triggerFileDownload(file.blob, file.filename ?? fallbackFilename);
    } catch {
      setError("Erreur lors de l'export CSV.");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    download,
    isLoading,
    error,
  };
}
