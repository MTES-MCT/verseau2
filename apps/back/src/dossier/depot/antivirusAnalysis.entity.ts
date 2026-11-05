import { BeforeInsert, Column, Entity, JoinColumn, OneToOne, PrimaryColumn, Unique } from 'typeorm';
import { AntivirusStatus } from '@lib/dossier';
import { BaseEntity } from '@shared/repository/base-entity';
import { DepotEntity } from './depot.entity';

@Entity('antivirus_analysis')
@Unique('UQ_antivirus_analysis_depot_id', ['depotId'])
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
