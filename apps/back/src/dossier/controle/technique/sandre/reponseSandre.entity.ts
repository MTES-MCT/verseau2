import { BaseEntity } from '@shared/repository/base-entity';
import { Entity, PrimaryColumn, Column, BeforeInsert, JoinColumn, OneToOne } from 'typeorm';
import { AcceptationStatus } from './sandre';
import { DepotEntity } from '@dossier/depot/depot.entity';

@Entity('reponse_sandre')
export class ReponseSandreEntity extends BaseEntity {
  @PrimaryColumn()
  declare id: string;

  @Column({ type: 'varchar' })
  jeton: string;

  @Column({ type: 'int', name: 'acceptation_status' })
  acceptationStatus: AcceptationStatus;

  @Column({ type: 'boolean', name: 'is_conformant' })
  isConformant: boolean;

  @Column({ type: 'varchar', name: 'code_scenario' })
  codeScenario: string;

  @Column({ type: 'varchar', name: 'version_scenario' })
  versionScenario: string;

  @Column({ type: 'varchar', nullable: true, name: 'error_code' })
  errorCode?: string;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage?: string;

  @Column({ type: 'varchar', nullable: true, name: 'error_location' })
  errorLocation?: string;

  @Column({ type: 'varchar', nullable: true, name: 'error_ligne' })
  errorLigne?: string;

  @Column({ type: 'varchar', nullable: true, name: 'error_colonne' })
  errorColonne?: string;

  @Column({ type: 'varchar', nullable: true, name: 'error_severite' })
  errorSeverite?: string;

  @OneToOne(() => DepotEntity, { nullable: true })
  @JoinColumn({ name: 'depot_id' })
  depot?: DepotEntity;

  @BeforeInsert()
  setId() {
    this.id = 'res_' + this.id;
  }
}
