import 'tsconfig-paths/register';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import path from 'path';

import { config } from 'dotenv';
config({ path: ['.env.local'] });

const configService = new ConfigService();
const migrationsPath = path.join(process.cwd(), 'src/infra/migrations/**/*{.ts,.js}');
const entities = path.join(process.cwd(), 'src/**/*.entity{.ts,.js}');

const MigrationDataSource = new DataSource({
  type: 'postgres',
  url: configService.getOrThrow<string>('DATABASE_URL'),
  migrations: [migrationsPath],
  schema: 'public',
  entities: [entities],
});
export default MigrationDataSource;
