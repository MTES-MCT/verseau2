import { useState } from 'react';
import { ApiError, type DownloadedFile } from '../api/apiClient';
import { triggerFileDownload } from '../helper/fileDownload';

export function useCsvExportDownload<TQuery>(downloadFile: (query: TQuery) => Promise<DownloadedFile>) {
  const [isLoading, setIsLoading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const download = async (query: TQuery, fallbackFilename: string) => {
    setDownloadError(null);
    setIsLoading(true);

    try {
      const file = await downloadFile(query);
      triggerFileDownload(file.blob, file.filename ?? fallbackFilename);
    } catch (error) {
      setDownloadError(getDownloadErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    download,
    isLoading,
    downloadError,
    setDownloadError,
  };
}

function getDownloadErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message.replace(/^[A-Z]+ .* failed:\s*/, '') || "Erreur lors de l'export CSV.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Erreur lors de l'export CSV.";
}
