import { BaseEntity } from '@shared/repository/base-entity';
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';
import { UserEntity } from '@user/user.entity';
import { ControleEntity } from '@dossier/controle/controle.entity';
import { DepotStep, DepotStatus } from '@lib/dossier';

@Entity('depot')
export class DepotEntity extends BaseEntity {
  @PrimaryColumn()
  declare id: string;

  @Column({ type: 'varchar', name: 'nom_original_fichier' })
  nomOriginalFichier: string;

  @Column({ type: 'varchar', nullable: true })
  path?: string;

  @Column({ type: 'bigint', name: 'taille_fichier' })
  tailleFichier: number;

  @Column({ type: 'varchar' })
  type: string;

  @Column({ type: 'varchar', nullable: true })
  error?: string;

  @Column({ type: 'enum', enum: DepotStep, default: 'UPLOADING_TO_S3' })
  step: DepotStep;

  @Column({ type: 'enum', enum: DepotStatus, default: 'PENDING' })
  status: DepotStatus;

  @ManyToOne(() => UserEntity, (user) => user.depots)
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @OneToMany(() => ControleEntity, (controle) => controle.depot)
  controles?: ControleEntity[];

  @BeforeInsert()
  setId() {
    this.id = 'dep_' + this.id;
  }
}
