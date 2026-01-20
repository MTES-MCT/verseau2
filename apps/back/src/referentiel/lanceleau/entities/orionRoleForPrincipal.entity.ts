import { Entity, PrimaryColumn } from 'typeorm';

@Entity('t_orion_role_for_principal', { schema: 'lanceleau', synchronize: false })
export class OrionRoleForPrincipalEntity {
  @PrimaryColumn({ name: 'pr_cdn' })
  prCdn: number;

  @PrimaryColumn({ name: 'role_cdn' })
  roleCdn: number;
}
