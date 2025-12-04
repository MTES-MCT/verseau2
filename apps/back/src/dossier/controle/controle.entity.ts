import { BaseEntity } from '@shared/repository/base-entity';
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { DepotEntity } from '@dossier/depot/depot.entity';
import { ControleName, ErrorCode } from '@lib/controle';

@Entity('controle')
export class ControleEntity extends BaseEntity {
  @PrimaryColumn()
  declare id: string;

  @Column({ type: 'enum', enum: ControleName })
  name: ControleName;

  @Column({ type: 'boolean', nullable: true })
  success?: boolean;

  @Column({ type: 'enum', enum: ErrorCode, nullable: true })
  error?: ErrorCode;

  @Column({ type: 'varchar', nullable: true, name: 'error_params', array: true })
  errorParams?: string[];

  @Column({ type: 'varchar', nullable: true, name: 'depot_id' })
  depotId?: string;

  @ManyToOne(() => DepotEntity, (depot) => depot.controles)
  @JoinColumn({ name: 'depot_id' })
  depot?: DepotEntity;

  @BeforeInsert()
  setId() {
    this.id = 'ctrl_' + this.id;
  }
}
