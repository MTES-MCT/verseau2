import { DataSource } from 'typeorm';
import { clearControles } from './controle.helper';

export interface DepotSeedData {
  id: string;
  nomOriginalFichier: string;
  tailleFichier: number;
  type: string;
  path?: string;
  status?: string;
  step?: string;
  userId?: string;
}

/**
 * Insert a depot record with minimal required fields
 */
export async function seedDepot(
  dataSource: DataSource,
  id: string,
  nomOriginalFichier: string = 'test.xml',
  tailleFichier: number = 1024,
  type: string = 'application/xml',
): Promise<void> {
  await dataSource.query(
    `
    INSERT INTO depot (id, nom_original_fichier, taille_fichier, type)
    VALUES ($1, $2, $3, $4)
  `,
    [id, nomOriginalFichier, tailleFichier, type],
  );
}

/**
 * Insert a depot record with all optional fields
 */
export async function seedDepotFull(dataSource: DataSource, data: DepotSeedData): Promise<void> {
  await dataSource.query(
    `
    INSERT INTO depot (id, nom_original_fichier, taille_fichier, type, path, status, step, user_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `,
    [
      data.id,
      data.nomOriginalFichier,
      data.tailleFichier,
      data.type,
      data.path ?? null,
      data.status ?? 'PENDING',
      data.step ?? 'UPLOADING_TO_S3',
      data.userId ?? null,
    ],
  );
}

/**
 * Clear all depot records
 */
export async function clearDepots(dataSource: DataSource): Promise<void> {
  await clearControles(dataSource);
  await dataSource.query(`DELETE FROM depot`);
}
