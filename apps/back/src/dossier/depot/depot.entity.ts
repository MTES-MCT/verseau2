import { BaseEntity } from '@shared/repository/base-entity';
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';
import { UserEntity } from '@user/user.entity';
import { ControleEntity } from '@dossier/controle/controle.entity';
import { DepotStep, DepotStatus, ControleV1Status, ControleSandreStatus } from '@lib/dossier';

@Entity('depot')
export class DepotEntity extends BaseEntity {
  @PrimaryColumn()
  declare id: string;

  @Column({ type: 'int', name: 'numero_depot_verseau_1', nullable: true })
  numeroDepotVerseau1?: number;

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

  @Column({ type: 'enum', enum: ControleV1Status, nullable: true, default: null })
  controleV1Status?: ControleV1Status;

  @Column({ type: 'enum', enum: ControleSandreStatus, nullable: true, default: null })
  controleSandreStatus?: ControleSandreStatus;

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
