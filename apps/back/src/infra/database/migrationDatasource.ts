import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import path from 'path';

import { config } from 'dotenv';
config({ path: ['.env.local'] });

const configService = new ConfigService();
const migrationsPath = path.join(process.cwd(), 'src/infra/migrations/**/*{.ts,.js}');
const MigrationDataSource = new DataSource({
  type: 'postgres',
  url: configService.getOrThrow<string>('DATABASE_URL'),
  synchronize: false,
  migrations: [migrationsPath],
});
export default MigrationDataSource;
