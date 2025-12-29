import { DataSource } from 'typeorm';

export async function clearResponseSandres(dataSource: DataSource): Promise<void> {
  await dataSource.query(`DELETE FROM reponse_sandre`);
}
