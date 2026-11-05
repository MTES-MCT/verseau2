import { MigrationInterface, QueryRunner } from 'typeorm';

/** Additive 1:1 table; historical absent analyses deliberately mean pending, never clean. */
export class AddAntivirusAnalysis1793836800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "antivirus_analysis" (
        "id" varchar NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "depot_id" varchar NOT NULL,
        "file_path" varchar,
        "status" varchar NOT NULL DEFAULT 'pending',
        "scanned_at" timestamptz,
        "sha256" varchar(64),
        "engine_version" varchar(256),
        "signature_version" varchar(256),
        "signature_updated_at" timestamptz,
        "detection" varchar(256),
        "error_code" varchar(256),
        "retryable" boolean,
        CONSTRAINT "PK_antivirus_analysis" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_antivirus_analysis_depot_id" UNIQUE ("depot_id"),
        CONSTRAINT "FK_antivirus_analysis_depot" FOREIGN KEY ("depot_id") REFERENCES "depot"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_antivirus_analysis_status" CHECK (status IN ('pending', 'clean', 'infected', 'error')),
        CONSTRAINT "CHK_antivirus_analysis_sha256" CHECK (sha256 IS NULL OR sha256 ~ '^[a-f0-9]{64}$'),
        CONSTRAINT "CHK_antivirus_analysis_verdict_metadata"
          CHECK (status NOT IN ('clean', 'infected') OR
            (file_path IS NOT NULL AND scanned_at IS NOT NULL AND sha256 IS NOT NULL AND
             engine_version IS NOT NULL AND signature_version IS NOT NULL AND signature_updated_at IS NOT NULL))
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('antivirus_analysis');
  }
}
