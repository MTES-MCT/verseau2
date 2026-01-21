import { DataSource } from 'typeorm';
import { seedOrionCredentials, seedAg, clearLanceleauData } from './createReferentielDataset';

export interface UserWithDroitsData {
  sub: string;
  email: string;
  nom?: string;
  prenom?: string;
  itvCdn: number;
  prCdn?: number;
}

/**
 * Seeds a complete user with lanceleau linking for authentication flow.
 * Creates:
 * - UserEntity with given sub and email
 * - OrionCredentialsEntity linking email to prCdn
 * - AgEntity linking prCdn to itvCdn
 *
 * This establishes the chain: User.email → OrionCredentials.mail → AgEntity.prCdn → AgEntity.itvCdn
 * which is used by DroitsUserService.resolveItvCdn()
 */
export async function seedUserWithDroits(dataSource: DataSource, data: UserWithDroitsData): Promise<string> {
  const userId = `user_${Date.now()}`;
  const prCdn = data.prCdn ?? 1000;

  // Create user
  await dataSource.query(
    `
    INSERT INTO "user" (id, sub, email, nom, prenom)
    VALUES ($1, $2, $3, $4, $5)
  `,
    [userId, data.sub, data.email, data.nom ?? 'Test', data.prenom ?? 'User'],
  );

  // Create orion credentials linking email to prCdn
  await seedOrionCredentials(dataSource, prCdn, data.email, data.sub);

  // Create ag linking prCdn to itvCdn
  await seedAg(dataSource, prCdn, data.itvCdn);

  return userId;
}

/**
 * Seeds a user without lanceleau linking (no ITV access).
 * Useful for testing 403 Forbidden scenarios.
 */
export async function seedUserWithoutDroits(
  dataSource: DataSource,
  data: Pick<UserWithDroitsData, 'sub' | 'email' | 'nom' | 'prenom'>,
): Promise<string> {
  const userId = `user_${Date.now()}`;

  await dataSource.query(
    `
    INSERT INTO "user" (id, sub, email, nom, prenom)
    VALUES ($1, $2, $3, $4, $5)
  `,
    [userId, data.sub, data.email, data.nom ?? 'Test', data.prenom ?? 'User'],
  );

  return userId;
}

/**
 * Clear all user and lanceleau data.
 */
export async function clearUserWithDroits(dataSource: DataSource): Promise<void> {
  await dataSource.query(`DELETE FROM depot`);
  await dataSource.query(`DELETE FROM "user"`);
  await clearLanceleauData(dataSource);
}
