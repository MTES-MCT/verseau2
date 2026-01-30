import { BaseEntity } from '@shared/repository/base-entity';
import { Entity, PrimaryColumn, Column, BeforeInsert, JoinColumn, OneToOne } from 'typeorm';
import { SandreAcceptationStatus } from '@lib/dossier';
import { DepotEntity } from '@dossier/depot/depot.entity';
import type { SandreValidationError, SandreValidationResult } from './sandre';

@Entity('reponse_sandre')
export class ReponseSandreEntity extends BaseEntity {
  @PrimaryColumn()
  declare id: string;

  @Column({ type: 'varchar' })
  jeton: string;

  @Column({ type: 'int', name: 'acceptation_status' })
  acceptationStatus: SandreAcceptationStatus;

  @Column({ type: 'boolean', name: 'is_conformant' })
  isConformant: boolean;

  @Column({ type: 'varchar', name: 'code_scenario' })
  codeScenario: string;

  @Column({ type: 'varchar', name: 'version_scenario' })
  versionScenario: string;

  @Column({ type: 'jsonb', nullable: true })
  errors?: SandreValidationError[];

  @Column({ type: 'jsonb', nullable: true })
  raw?: SandreValidationResult;

  @OneToOne(() => DepotEntity, { nullable: true })
  @JoinColumn({ name: 'depot_id' })
  depot?: DepotEntity;

  @BeforeInsert()
  setId() {
    this.id = 'res_' + this.id;
  }
}
