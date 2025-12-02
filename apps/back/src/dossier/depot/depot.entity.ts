import { BaseEntity } from '@shared/repository/base-entity';
import { BeforeInsert, Column, CreateDateColumn, Entity, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from '@user/user.entity';

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

  @Column({ type: 'varchar', nullable: true })
  error?: string;

  @Column({ type: 'varchar', name: 'user_id', nullable: true })
  userId?: string;

  @ManyToOne(() => UserEntity, (user) => user.depots)
  user?: UserEntity;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @BeforeInsert()
  setId() {
    this.id = 'dep_' + this.id;
  }
}
