import { ItvEntity } from './entities/itv.entity';
import { SupEntity } from './entities/sup.entity';
import { FanEntity } from './entities/fan.entity';
import { ParEntity } from './entities/par.entity';
import { UrfEntity } from './entities/urf.entity';
import { AgByLogin, IntervenantAuth, ItvCdnByRfa, RolePrincipal, VSteuSclItvResult } from '@masa/masa.dto';
import { OrionContact } from './lanceleau.model';

export interface LanceleauGateway {
  findIntervenantById(itvCdn: number): Promise<IntervenantAuth | null>;
  findItvByRfa(itvRfa: string): Promise<ItvEntity | null>;
  findItvBatchByRfas(rfas: string[]): Promise<ItvCdnByRfa[]>;
  findSupByRfa(supRfa: string): Promise<SupEntity | null>;
  findFanByRfa(fanRfa: string): Promise<FanEntity | null>;
  findParByRfa(parRfa: string): Promise<ParEntity | null>;
  findUrfByRfa(urfRfa: string): Promise<UrfEntity | null>;
  hasRole(prCdn: number, roleCdn: number): Promise<boolean>;
  findOrionRolesByPrCdn(prCdn: number): Promise<RolePrincipal[] | null>;
  findAgByLogin(login: string): Promise<AgByLogin | null>;
  findVSteuSclItvByCodes(steuCodes: string[], sclCodes: string[]): Promise<VSteuSclItvResult[]>;
  findVSteuSclItvByItvRfa(itvRfa: string): Promise<VSteuSclItvResult[]>;
  findSiretByLogin(login: string): Promise<string | null>;
  findOrionContactByLogin(login: string): Promise<OrionContact | null>;
}

export const LanceleauGateway = Symbol('LanceleauGateway');
