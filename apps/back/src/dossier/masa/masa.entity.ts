import { BaseEntity } from '@shared/repository/base-entity';
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { DepotEntity } from '../depot/depot.entity';

export enum MasaStatus {
  REFUSE = 'REFUSE',
  INTEGRE = 'INTEGRE',
  INTEGRATION_PARTIELLE = 'INTEGRATION_PARTIELLE',
}

@Entity('masa')
export class MasaEntity extends BaseEntity {
  @PrimaryColumn()
  declare id: string;

  @Column({ type: 'varchar', name: 'depot_id' })
  depotId: string;

  @ManyToOne(() => DepotEntity)
  @JoinColumn({ name: 'depot_id' })
  depot: DepotEntity;

  @Column({ type: 'varchar', name: 'numero_depot_verseau_1', nullable: true })
  numeroDepotVerseau1: string;

  @Column({ type: 'enum', enum: MasaStatus })
  statut: MasaStatus;

  @Column({ type: 'text', nullable: true })
  rapport: string;

  @BeforeInsert()
  setId() {
    this.id = 'masa_' + this.id;
  }
}
