import { ItvEntity } from './entities/itv.entity';

export interface LanceleauGateway {
  findItv(): Promise<ItvEntity[]>;
  findItvById(id: string): Promise<ItvEntity | null>;
}

export const LanceleauGateway = Symbol('LanceleauGateway');
