import { BaseEntity } from '@shared/repository/base-entity';
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert } from 'typeorm';

@Entity('depot')
export class DepotEntity extends BaseEntity {
  @PrimaryColumn()
  declare id: string;

  @Column({ type: 'varchar' })
  name: string;

  // @Column({ type: 'varchar' })
  // path: string;

  @Column({ type: 'bigint' })
  size: number;

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

  // constructor(depotEntity: Omit<DepotEntity, 'id' | 'setId'>) {
  //   super();
  //   Object.assign(this, depotEntity);
  // }
}
