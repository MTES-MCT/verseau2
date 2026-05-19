import { BaseEntity } from '@shared/repository/base-entity';
import {
  BeforeInsert,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { UserEntity } from '@user/user.entity';
import { ControleEntity } from '@dossier/controle/controle.entity';
import { DepotStep, DepotStatus, EtapeMetier, ControleStatus, ControleSandreStatus } from '@lib/dossier';
import { MasaEntity } from '@dossier/masa/masa.entity';
import { DepotError } from '@dossier/depot/depotError';

@Entity('depot')
export class DepotEntity extends BaseEntity {
  @PrimaryColumn()
  declare id: string;

  @Column({ type: 'varchar', name: 'nom_original_fichier' })
  nomOriginalFichier: string;

  @Column({ type: 'varchar', nullable: true })
  path?: string;

  @Column({ type: 'varchar', name: 'rapport_path', nullable: true })
  rapportPath?: string;

  @Column({ type: 'bigint', name: 'taille_fichier' })
  tailleFichier: number;

  @Column({ type: 'varchar' })
  type: string;

  @Column({ type: 'enum', enum: DepotError, nullable: true })
  error?: DepotError;

  @Column({ type: 'enum', enum: DepotStep, nullable: true })
  step?: DepotStep;

  @Column({ type: 'enum', enum: DepotStep, default: [], name: 'step_history', array: true, nullable: true })
  stepHistory?: DepotStep[];

  @Column({
    type: 'enum',
    enum: EtapeMetier,
    nullable: true,
    default: null,
    name: 'etape_metier',
  })
  etapeMetier?: EtapeMetier | null;

  @Column({ type: 'enum', enum: DepotStatus, default: DepotStatus.EN_COURS_DE_TRAITEMENT })
  status: DepotStatus;

  @Column({ type: 'enum', enum: ControleStatus, nullable: true, default: null, name: 'controle_status' })
  controleStatus?: ControleStatus;

  @Column({ type: 'enum', enum: ControleSandreStatus, nullable: true, default: null, name: 'controle_sandre_status' })
  controleSandreStatus?: ControleSandreStatus;

  @Column({ type: 'bigint', name: 'itv_cdn', nullable: true })
  @Index()
  itvCdn?: number;

  @Column({ type: 'varchar', name: 'user_id', nullable: true })
  @Index()
  userId?: string;

  @ManyToOne(() => UserEntity, (user) => user.depots)
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @OneToMany(() => ControleEntity, (controle) => controle.depot)
  controles?: ControleEntity[];

  @OneToOne(() => MasaEntity, (masa) => masa.depot)
  masa?: MasaEntity;

  @BeforeInsert()
  setId() {
    this.id = 'dep_' + this.id;
  }

  public updateStep(newStep: DepotStep): void {
    if (this.step !== newStep) {
      this.stepHistory = this.stepHistory || [];
      this.stepHistory.push(newStep);
      this.step = newStep;
    }
  }
}
