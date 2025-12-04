import { BaseEntity } from '@shared/repository/base-entity';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { DepotEntity } from '@dossier/depot/depot.entity';

@Entity('user')
export class UserEntity extends BaseEntity {
  @Column({ type: 'varchar', unique: true })
  @Index()
  sub: string; // OIDC subject claim

  @Column({ type: 'varchar', name: 'itv_cdn' })
  itvCdn: string; // External ID from referentiel

  @OneToMany(() => DepotEntity, (depot) => depot.user)
  depots: DepotEntity[];
}
