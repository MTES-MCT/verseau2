import type { ReponseSandreCreateModel, ReponseSandreModel } from './reponseSandre.model';

export interface ReponseSandreGateway {
  findByDepotId(depotId: string): Promise<ReponseSandreModel[]>;
  createReponseSandre(data: ReponseSandreCreateModel): Promise<ReponseSandreModel>;
}

export const ReponseSandreGateway = Symbol('ReponseSandreGateway');
