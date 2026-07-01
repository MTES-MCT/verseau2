import { Injectable } from '@nestjs/common';
import { zipSync } from 'fflate';
import type { Zip } from './zip';

@Injectable()
export class ZipService implements Zip {
  createArchive(files: Record<string, Buffer>): Buffer {
    return Buffer.from(zipSync(files));
  }
}
