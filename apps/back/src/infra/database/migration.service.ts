import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

/**
 * Service to run TypeORM migrations on startup with multi-instance safety.
 * Uses Postgres advisory locks to ensure only one instance runs migrations at a time.
 */
@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);
  private readonly ADVISORY_LOCK_ID = 123456; // Arbitrary stable ID for the lock

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Run pending migrations with a Postgres advisory lock.
   * Blocks until the lock is acquired (other instances will wait).
   * Fails fast if DB connection fails or migrations cannot run.
   */
  async runMigrationsIfEnabled(): Promise<void> {
    const isEnabled = this.configService.get<string>('RUN_MIGRATIONS_ON_STARTUP') === 'true';
    if (!isEnabled) {
      this.logger.log('RUN_MIGRATIONS_ON_STARTUP is false; skipping migrations');
      return;
    }

    if (!this.dataSource.isInitialized) {
      throw new Error('DataSource must be initialized before running migrations');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();

      // Acquire advisory lock (blocks until available)
      this.logger.log(`Attempting to acquire advisory lock (ID: ${this.ADVISORY_LOCK_ID})...`);
      await queryRunner.query(`SELECT pg_advisory_lock($1)`, [this.ADVISORY_LOCK_ID]);
      this.logger.log('Advisory lock acquired');

      // Run migrations
      this.logger.log('Running pending migrations...');
      const migrations = await this.dataSource.runMigrations({ transaction: 'each' });
      this.logger.log(`Successfully ran ${migrations.length} migration(s)`);

      // Lock is automatically released when connection closes
    } catch (error) {
      this.logger.error('Failed to run migrations', error);
      throw new Error(`Migration execution failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await queryRunner.release();
    }
  }
}
