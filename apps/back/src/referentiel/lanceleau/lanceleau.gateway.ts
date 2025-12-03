import { ItvEntity } from './entities/itv.entity';
import { SupEntity } from './entities/sup.entity';
import { FanEntity } from './entities/fan.entity';
import { ParEntity } from './entities/par.entity';
import { UrfEntity } from './entities/urf.entity';

export interface LanceleauGateway {
  findItv(): Promise<ItvEntity[]>;
  findItvById(id: string): Promise<ItvEntity | null>;
  findByItvCdn(itvCdn: string): Promise<ItvEntity | null>;
  findItvByRfa(itvRfa: string): Promise<ItvEntity | null>;
  findSupByRfa(supRfa: string): Promise<SupEntity | null>;
  findFanByRfa(fanRfa: string): Promise<FanEntity | null>;
  findParByRfa(parRfa: string): Promise<ParEntity | null>;
  findUrfByRfa(urfRfa: string): Promise<UrfEntity | null>;
}

export const LanceleauGateway = Symbol('LanceleauGateway');
