import { filenameSchema } from './filename.schema';

export function sanitizeFilename(filename: string): string {
  const result = filenameSchema.safeParse(filename);

  if (!result.success) {
    return (
      filename
        .replace(/\.\.\//g, '')
        .replace(/\.\.\\/g, '')
        .replace(/[/\\]/g, '')
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x1f\x7f]/g, '')
        .replace(/[";]/g, '')
    );
  }

  return result.data;
}
