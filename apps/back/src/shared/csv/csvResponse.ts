import type { Response } from 'express';
import { sanitizeFilename } from '@shared/schema/filename.service';
import { CSV_CONTENT_TYPE } from './csv.constants';

export function sendCsvResponse(res: Response, filename: string, csvContent: string): void {
  res.set({
    'Content-Type': CSV_CONTENT_TYPE,
    'Content-Disposition': `attachment; filename=${sanitizeFilename(filename)}`,
  });

  res.send(csvContent);
}
