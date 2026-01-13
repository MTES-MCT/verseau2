import { filenameSchema } from './filename.schema';
import { sanitizeFilename } from './filename.service';

describe('filenameSchema', () => {
  it('should trim whitespace', () => {
    expect(filenameSchema.parse('  file.xml  ')).toBe('file.xml');
  });

  it('should remove path traversal attempts', () => {
    expect(filenameSchema.parse('../../../etc/passwd')).toBe('etcpasswd');
    expect(filenameSchema.parse('..\\..\\file.xml')).toBe('file.xml');
  });

  it('should remove path separators', () => {
    expect(filenameSchema.parse('path/to/file.xml')).toBe('pathtofile.xml');
  });

  it('should remove control characters', () => {
    expect(filenameSchema.parse('file\x00name.xml')).toBe('filename.xml');
  });

  it('should remove semicolons and quotes', () => {
    expect(filenameSchema.parse('file";name.xml')).toBe('filename.xml');
  });

  it('should preserve valid filenames with accents', () => {
    expect(filenameSchema.parse('panissières.xml')).toBe('panissières.xml');
  });

  it('should return empty string if everything is removed', () => {
    expect(filenameSchema.parse('../')).toBe('');
  });
});

describe('sanitizeFilename helper', () => {
  it('should return sanitized filename for valid input', () => {
    expect(sanitizeFilename('valid.xml')).toBe('valid.xml');
  });

  it('should sanitize unsafe input', () => {
    expect(sanitizeFilename('../hack.xml')).toBe('hack.xml');
  });
});
