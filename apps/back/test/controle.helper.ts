import { DataSource } from 'typeorm';
import { clearResponseSandres } from './responseSandre.helper';

export async function clearControles(dataSource: DataSource): Promise<void> {
  await clearResponseSandres(dataSource);
  await dataSource.query(`DELETE FROM controle`);
}
