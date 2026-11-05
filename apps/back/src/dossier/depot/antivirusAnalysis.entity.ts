import { BeforeInsert, Check, Column, Entity, JoinColumn, OneToOne, PrimaryColumn, Unique } from 'typeorm';
import { AntivirusStatus } from '@lib/dossier';
import { BaseEntity } from '@shared/repository/base-entity';
import { DepotEntity } from './depot.entity';

@Entity('antivirus_analysis')
@Unique('UQ_antivirus_analysis_depot_id', ['depotId'])
@Check('CHK_antivirus_analysis_status', "status IN ('pending', 'clean', 'infected', 'error')")
@Check('CHK_antivirus_analysis_sha256', "sha256 IS NULL OR sha256 ~ '^[a-f0-9]{64}$'")
@Check(
  'CHK_antivirus_analysis_verdict_metadata',
  "status NOT IN ('clean', 'infected') OR (file_path IS NOT NULL AND scanned_at IS NOT NULL AND sha256 IS NOT NULL AND engine_version IS NOT NULL AND signature_version IS NOT NULL AND signature_updated_at IS NOT NULL)",
)
export class AntivirusAnalysisEntity extends BaseEntity {
  @PrimaryColumn({ primaryKeyConstraintName: 'PK_antivirus_analysis' })
  declare id: string;

  @Column({ type: 'varchar', name: 'depot_id' })
  depotId: string;

  @OneToOne(() => DepotEntity, (depot) => depot.antivirusAnalysis, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'depot_id', foreignKeyConstraintName: 'FK_antivirus_analysis_depot' })
  depot: DepotEntity;

  @Column({ type: 'varchar', name: 'file_path', nullable: true })
  filePath: string | null;

  @Column({ type: 'varchar', default: AntivirusStatus.PENDING })
  status: AntivirusStatus;

  @Column({ type: 'timestamptz', name: 'scanned_at', nullable: true })
  scannedAt: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  sha256: string | null;

  @Column({ type: 'varchar', length: 256, name: 'engine_version', nullable: true })
  engineVersion: string | null;

  @Column({ type: 'varchar', length: 256, name: 'signature_version', nullable: true })
  signatureVersion: string | null;

  @Column({ type: 'timestamptz', name: 'signature_updated_at', nullable: true })
  signatureUpdatedAt: Date | null;

  @Column({ type: 'varchar', length: 256, nullable: true })
  detection: string | null;

  @Column({ type: 'varchar', length: 256, name: 'error_code', nullable: true })
  errorCode: string | null;

  @Column({ type: 'boolean', nullable: true })
  retryable: boolean | null;

  @BeforeInsert()
  setId() {
    this.id = 'av_' + this.id;
  }
}
