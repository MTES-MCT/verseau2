import { BaseEntity } from '@shared/repository/base-entity';
import { BeforeInsert, Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { DepotEntity } from '../depot/depot.entity';
import { MasaStatus, MasaWebhookStatus } from './masa.model';

@Entity('masa')
export class MasaEntity extends BaseEntity {
  @PrimaryColumn()
  declare id: string;

  @Column({ type: 'varchar', name: 'depot_id', unique: true })
  depotId: string;

  @OneToOne(() => DepotEntity, (depot) => depot.masa)
  @JoinColumn({ name: 'depot_id' })
  depot: DepotEntity;

  @Column({ type: 'varchar', name: 'numero_depot_verseau_1', nullable: true })
  numeroDepotVerseau1: string | null;

  @Column({ type: 'enum', enum: MasaStatus })
  statut: MasaStatus;

  @Column({ type: 'varchar', name: 'statut_masa', nullable: true })
  statutMasa: MasaWebhookStatus | null;

  @Column({ type: 'text', nullable: true })
  rapport: string | null;

  @BeforeInsert()
  setId() {
    this.id = 'masa_' + this.id;
  }
}
