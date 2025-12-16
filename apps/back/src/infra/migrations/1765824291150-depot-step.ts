import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DepotStep1765824291150 implements MigrationInterface {
  transaction = true;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE depot_step_enum ADD VALUE IF NOT EXISTS 'CONTROLE_COMPLETED';
    `);
  }

  public async down(): Promise<void> {}
}
