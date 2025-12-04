import { DepotModel } from './depot.model';

export interface DepotGateway {
  createDepot(depot: Partial<DepotModel>): Promise<DepotModel>;
  findDepotById(id: string): Promise<DepotModel | null>;
  findAllDepotsByAdmin(): Promise<DepotModel[]>;
  updateDepot(id: string, updateData: Partial<DepotModel>): Promise<DepotModel | null>;
  findByUserId(userId: string): Promise<DepotModel[]>;
}

export const DepotGateway = Symbol('DepotGateway');
