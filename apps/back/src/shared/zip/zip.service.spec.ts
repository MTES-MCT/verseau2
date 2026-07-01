import { unzipSync } from 'fflate';
import { ZipService } from './zip.service';

describe('ZipService', () => {
  it('creates a zip archive with the provided files', () => {
    const service = new ZipService();

    const archive = service.createArchive({
      'depot.xml': Buffer.from('<xml />'),
      'rapport.pdf': Buffer.from('pdf-content'),
    });

    const entries = unzipSync(archive);
    expect(Buffer.from(entries['depot.xml']).toString('utf8')).toBe('<xml />');
    expect(Buffer.from(entries['rapport.pdf']).toString('utf8')).toBe('pdf-content');
  });
});
