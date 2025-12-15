import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RenamControleV1StatusToControleStatus1734258000000 implements MigrationInterface {
  transaction = true;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename column
    await queryRunner.renameColumn('depot', 'controleV1Status', 'controle_status');
    await queryRunner.renameColumn('depot', 'controleSandreStatus', 'controle_sandre_status');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert: rename back to original camelCase column names
    await queryRunner.renameColumn('depot', 'controle_status', 'controleV1Status');
    await queryRunner.renameColumn('depot', 'controle_sandre_status', 'controleSandreStatus');
  }
}
