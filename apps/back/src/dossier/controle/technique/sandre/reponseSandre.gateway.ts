import type { ReponseSandreCreateModel, ReponseSandreModel } from './reponseSandre.model';

export interface ReponseSandreGateway {
  findByDepotId(depotId: string): Promise<ReponseSandreModel[]>;
  findByJeton(jeton: string): Promise<ReponseSandreModel | null>;
  createReponseSandre(data: ReponseSandreCreateModel): Promise<ReponseSandreModel>;
  updateReponseSandre(id: string, updateData: Partial<ReponseSandreModel>): Promise<ReponseSandreModel | null>;
}

export const ReponseSandreGateway = Symbol('ReponseSandreGateway');
