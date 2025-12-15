import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { fileURLToPath } from 'url';
import path from 'path';

import { config } from 'dotenv';
config({ path: ['.env.local'] });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configService = new ConfigService();
const migrationsPath = path.join(__dirname, '../migrations/**/*{.ts,.js}');
const MigrationDataSource = new DataSource({
  type: 'postgres',
  url: configService.getOrThrow<string>('DATABASE_URL'),
  synchronize: false,
  migrations: [migrationsPath],
});
export default MigrationDataSource;
