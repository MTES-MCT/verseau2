import { DataSource } from 'typeorm';
import { seedOrionCredentials, seedAg, seedItv, clearLanceleauData } from './createReferentielDataset';

export interface UserWithDroitsData {
  sub: string;
  email: string;
  nom?: string;
  prenom?: string;
  itvCdn: number;
  prCdn?: number;
  /** SIRET for the intervenant (itvRfa). If provided, ItvEntity and role 301 will be seeded */
  itvRfa?: string;
}

/**
 * Seeds a complete user with lanceleau linking for authentication flow.
 * Creates:
 * - UserEntity with given sub and email
 * - OrionCredentialsEntity linking email to prCdn
 * - AgEntity linking prCdn to itvCdn
 * - If itvRfa is provided:
 *   - ItvEntity with itvCdn and itvRfa (SIRET)
 *   - OrionRoleForPrincipal with role 301 (required for depot)
 *
 * This establishes the chain: User.email → OrionCredentials.mail → AgEntity.prCdn → AgEntity.itvCdn
 * which is used by DroitsUserService.resolveItvCdn()
 *
 * For DroitsDepotService.validateDroits(), you also need:
 * - VSteuSclItvEntity entries linking STEU/SCL codes to the user's SIRET (use seedVSteuSclItv)
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

  // If itvRfa is provided, create the ItvEntity and role 301
  if (data.itvRfa) {
    // Create ItvEntity with the SIRET
    await seedItv(dataSource, data.itvCdn, data.itvRfa);

    // Create role 301 for depot permission
    await seedOrionRoleForPrincipal(dataSource, prCdn, 301);
  }

  return userId;
}

/**
 * Seeds OrionRoleForPrincipal entry.
 */
export async function seedOrionRoleForPrincipal(dataSource: DataSource, prCdn: number, roleCdn: number): Promise<void> {
  await dataSource.query(`INSERT INTO lanceleau.t_orion_role_for_principal (pr_cdn, role_cdn) VALUES ($1, $2)`, [
    prCdn,
    roleCdn,
  ]);
}

/**
 * Seeds VSteuSclItv entry to authorize a SIRET for specific STEU and/or SCL codes.
 * This is required for DroitsDepotService.validateDroits() to pass.
 *
 * @param steuCda - Code ouvrage de depollution (STEU), use empty string if not applicable
 * @param sclCda - Code systeme de collecte (SCL), use empty string if not applicable
 * @param moItvRfa - SIRET of the authorized intervenant (maitre d'ouvrage)
 * @param satItvRfa - SIRET of the SAT intervenant (optional)
 * @param aeItvRfa - SIRET of the AE intervenant (optional)
 */
export async function seedVSteuSclItv(
  dataSource: DataSource,
  steuCda: string,
  sclCda: string,
  moItvRfa: string,
  satItvRfa?: string,
  aeItvRfa?: string,
): Promise<void> {
  await dataSource.query(
    `INSERT INTO verseau.v_steu_scl_itv (steu_cda, scl_cda, mo_itv_rfa, sat_itv_rfa, ae_itv_rfa) VALUES ($1, $2, $3, $4, $5)`,
    [steuCda, sclCda, moItvRfa, satItvRfa ?? '', aeItvRfa ?? ''],
  );
}

/**
 * Seeds a user with expert bassin role (303) and ITV/SIRET but no deposant role (301).
 * Used to test that expert bassin users go through ouvrage-level rights checks.
 */
export async function seedUserExpertBassin(dataSource: DataSource, data: UserWithDroitsData): Promise<string> {
  const userId = `user_${Date.now()}`;
  const prCdn = data.prCdn ?? 1000;

  await dataSource.query(
    `
    INSERT INTO "user" (id, sub, email, nom, prenom)
    VALUES ($1, $2, $3, $4, $5)
  `,
    [userId, data.sub, data.email, data.nom ?? 'Test', data.prenom ?? 'User'],
  );

  await seedOrionCredentials(dataSource, prCdn, data.email, data.sub);
  await seedAg(dataSource, prCdn, data.itvCdn);

  if (data.itvRfa) {
    await seedItv(dataSource, data.itvCdn, data.itvRfa);
  }

  // Seed role 303 (expert bassin) instead of role 301 (deposant)
  await seedOrionRoleForPrincipal(dataSource, prCdn, 303);

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
  await dataSource.query(`DELETE FROM masa`);
  await dataSource.query(`DELETE FROM depot`);
  await dataSource.query(`DELETE FROM "user"`);
  await dataSource.query(`DELETE FROM verseau.v_steu_scl_itv`);
  await clearLanceleauData(dataSource);
}
