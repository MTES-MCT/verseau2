import { MigrationInterface, QueryRunner } from 'typeorm';

export class MiscUpdate1765967352364 implements MigrationInterface {
  name = 'MiscUpdate1765967352364';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "depot" DROP COLUMN "controle_status_XXXX"`);
    await queryRunner.query(`CREATE TYPE "public"."controle_evenement_type_enum" AS ENUM('ERREUR', 'AVERTISSEMENT')`);
    await queryRunner.query(`ALTER TABLE "controle" ADD "evenement_type" "public"."controle_evenement_type_enum"`);
    await queryRunner.query(`ALTER TYPE "public"."depot_step_enum" RENAME TO "depot_step_enum_old"`);
    await queryRunner.query(
      `CREATE TYPE "public"."depot_step_enum" AS ENUM('UPLOADING_TO_S3', 'CONTROLE_IN_PROGRESS', 'CONTROLE_COMPLETED', 'CONTROLE_FAILED', 'CONTROLE_SANDRE_IN_PROGRESS', 'CONTROLE_SANDRE_COMPLETED', 'CONTROLE_SANDRE_FAILED', 'PARSER_SANDRE_IN_PROGRESS', 'PARSER_SANDRE_FAILED', 'READY_FOR_SFTP', 'SFTP_IN_PROGRESS', 'SFTP_FAILED', 'SFTP_COMPLETED')`,
    );
    await queryRunner.query(`ALTER TABLE "depot" ALTER COLUMN "step" DROP DEFAULT`);
    // update depot.step == 'CONTROLE_V1_COMPLETED' to 'CONTROLE_COMPLETED'
    await queryRunner.query(`UPDATE "depot" SET "step" = 'CONTROLE_COMPLETED' WHERE "step" = 'CONTROLE_V1_COMPLETED'`);
    await queryRunner.query(
      `ALTER TABLE "depot" ALTER COLUMN "step" TYPE "public"."depot_step_enum" USING "step"::"text"::"public"."depot_step_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "depot" ALTER COLUMN "step" SET DEFAULT 'UPLOADING_TO_S3'`);
    await queryRunner.query(`DROP TYPE "public"."depot_step_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."depot_step_enum_old" AS ENUM('UPLOADING_TO_S3', 'CONTROLE_IN_PROGRESS', 'CONTROLE_COMPLETED', 'CONTROLE_FAILED', 'CONTROLE_V1_COMPLETED', 'CONTROLE_V1_FAILED', 'CONTROLE_SANDRE_IN_PROGRESS', 'CONTROLE_SANDRE_COMPLETED', 'CONTROLE_SANDRE_FAILED', 'PARSER_SANDRE_IN_PROGRESS', 'PARSER_SANDRE_FAILED', 'READY_FOR_SFTP', 'SFTP_IN_PROGRESS', 'SFTP_FAILED', 'SFTP_COMPLETED')`,
    );
    await queryRunner.query(`ALTER TABLE "depot" ALTER COLUMN "step" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "depot" ALTER COLUMN "step" TYPE "public"."depot_step_enum_old" USING "step"::"text"::"public"."depot_step_enum_old"`,
    );
    await queryRunner.query(`ALTER TABLE "depot" ALTER COLUMN "step" SET DEFAULT 'UPLOADING_TO_S3'`);
    await queryRunner.query(`DROP TYPE "public"."depot_step_enum"`);
    await queryRunner.query(`ALTER TYPE "public"."depot_step_enum_old" RENAME TO "depot_step_enum"`);
    await queryRunner.query(`ALTER TABLE "controle" DROP COLUMN "evenement_type"`);
    await queryRunner.query(`DROP TYPE "public"."controle_evenement_type_enum"`);
    await queryRunner.query(`ALTER TABLE "depot" ADD "controle_status_XXXX" character varying`);
  }
}
