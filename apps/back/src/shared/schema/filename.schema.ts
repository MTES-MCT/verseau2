import { z } from 'zod';

export const filenameSchema = z
  .string()
  .trim()
  .transform((filename) =>
    filename
      // Remove path traversal attempts
      .replace(/\.\.\//g, '')
      .replace(/\.\.\\/g, '')
      // Remove path separators
      .replace(/[/\\]/g, '')
      // Remove control characters and null bytes
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1f\x7f]/g, '')
      // Remove characters problematic in Content-Disposition headers
      .replace(/[";]/g, ''),
  );
