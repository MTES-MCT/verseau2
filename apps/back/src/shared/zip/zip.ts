export interface Zip {
  createArchive(files: Record<string, Buffer>): Buffer;
}

export const Zip = Symbol('Zip');
