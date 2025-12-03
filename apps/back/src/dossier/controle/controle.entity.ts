import { BaseEntity } from '@shared/repository/base-entity';
import { BeforeInsert, Column, CreateDateColumn, Entity, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { DepotEntity } from '@dossier/depot/depot.entity';
import { ControleName, ErrorCode } from '@lib/controle';

@Entity('controle')
export class ControleEntity extends BaseEntity {
  @PrimaryColumn()
  declare id: string;

  @Column({ type: 'varchar' })
  name: ControleName;

  @Column({ type: 'varchar', nullable: true })
  status?: string;

  @Column({ type: 'varchar', nullable: true })
  error?: ErrorCode;

  @Column({ type: 'varchar', nullable: true })
  depotId?: string;

  @ManyToOne(() => DepotEntity, (depot) => depot.controles)
  depot?: DepotEntity;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @BeforeInsert()
  setId() {
    this.id = 'ctrl_' + this.id;
  }
}
