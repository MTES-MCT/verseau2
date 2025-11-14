import { BaseEntity } from '@shared/repository/base-entity';
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert } from 'typeorm';

@Entity('depot')
export class DepotEntity extends BaseEntity {
  @PrimaryColumn()
  declare id: string;

  @Column({ type: 'varchar' })
  nomOriginalFichier: string;

  @Column({ type: 'varchar', nullable: true })
  path?: string;

  @Column({ type: 'bigint' })
  tailleFichier: number;

  @Column({ type: 'varchar' })
  type: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @BeforeInsert()
  setId() {
    this.id = 'dep_' + this.id;
  }
}
