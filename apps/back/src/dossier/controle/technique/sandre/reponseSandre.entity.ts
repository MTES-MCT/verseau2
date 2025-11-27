import { BaseEntity } from '@shared/repository/base-entity';
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { AcceptationStatus } from './sandre';
import { DepotEntity } from '@dossier/depot/depot.entity';

@Entity('reponse_sandre')
export class ReponseSandreEntity extends BaseEntity {
  @PrimaryColumn()
  declare id: string;

  @Column({ type: 'varchar' })
  jeton: string;

  @Column({ type: 'int' })
  acceptationStatus: AcceptationStatus;

  @Column({ type: 'boolean' })
  isConformant: boolean;

  @Column({ type: 'varchar' })
  codeScenario: string;

  @Column({ type: 'varchar' })
  versionScenario: string;

  @Column({ type: 'varchar', nullable: true })
  errorCode?: string;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'varchar', nullable: true })
  errorLocation?: string;

  @Column({ type: 'varchar', nullable: true })
  errorLigne?: string;

  @Column({ type: 'varchar', nullable: true })
  errorColonne?: string;

  @Column({ type: 'varchar', nullable: true })
  errorSeverite?: string;

  @OneToOne(() => DepotEntity, { nullable: true })
  @JoinColumn({ name: 'depotId' })
  depot?: DepotEntity;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @BeforeInsert()
  setId() {
    this.id = 'res_' + this.id;
  }
}
