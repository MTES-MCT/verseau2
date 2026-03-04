import { ItvEntity } from './entities/itv.entity';
import { SupEntity } from './entities/sup.entity';
import { FanEntity } from './entities/fan.entity';
import { ParEntity } from './entities/par.entity';
import { UrfEntity } from './entities/urf.entity';
import { OrionCredentialsEntity } from './entities/orionCredentials.entity';
import { OrionRoleForPrincipalEntity } from './entities/orionRoleForPrincipal.entity';
import { AgEntity } from './entities/ag.entity';
import { VSteuSclItvEntity } from './entities/vSteuSclItv.entity';
import { ItvCdnByRfa } from '@masa/masa.dto';

export interface LanceleauGateway {
  findItv(): Promise<ItvEntity[]>;
  findItvById(id: number): Promise<ItvEntity | null>;
  findByItvCdn(itvCdn: number): Promise<ItvEntity | null>;
  findItvByRfa(itvRfa: string): Promise<ItvEntity | null>;
  findItvBatchByRfas(rfas: string[]): Promise<ItvCdnByRfa[]>;
  findSupByRfa(supRfa: string): Promise<SupEntity | null>;
  findFanByRfa(fanRfa: string): Promise<FanEntity | null>;
  findParByRfa(parRfa: string): Promise<ParEntity | null>;
  findUrfByRfa(urfRfa: string): Promise<UrfEntity | null>;
  findOrionCredentialsByEmail(email: string): Promise<OrionCredentialsEntity | null>;
  findOrionRoleForPrincipal(prCdn: number, roleCdn: number): Promise<OrionRoleForPrincipalEntity | null>;
  findAgByPrCdn(prCdn: number): Promise<AgEntity | null>;
  findAgByEmail(email: string): Promise<AgEntity | null>;
  findAgsByItvCdn(itvCdn: number): Promise<AgEntity[]>;
  findOrionCredentialsByPrCdn(prCdn: number): Promise<OrionCredentialsEntity | null>;
  findVSteuSclItvByCodes(steuCodes: string[], sclCodes: string[]): Promise<VSteuSclItvEntity[]>;
  findVSteuSclItvByItvRfa(itvRfa: string): Promise<VSteuSclItvEntity[]>;
}

export const LanceleauGateway = Symbol('LanceleauGateway');
