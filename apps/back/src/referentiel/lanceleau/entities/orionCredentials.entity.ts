import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('t_orion_credentials', { schema: 'lanceleau', synchronize: false })
export class OrionCredentialsEntity {
  @PrimaryColumn({ name: 'pr_cdn' })
  prCdn: string;

  @Column({ name: 'mail' })
  mail: string;

  @Column({ name: 'login_lb' })
  loginLb: string;
}
