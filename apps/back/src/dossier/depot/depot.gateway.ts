import { DepotModel, UpdateDepotModel } from './depot.model';

export interface DepotGateway {
  createDepot(depot: Partial<DepotModel>): Promise<DepotModel>;
  findDepotById(id: string): Promise<DepotModel | null>;
  findDepotByIdWithUser(id: string): Promise<DepotModel | null>;
  findAllDepotsByAdmin(): Promise<DepotModel[]>;
  updateDepot(id: string, updateData: UpdateDepotModel): Promise<DepotModel | null>;
  findByUserId(userId: string): Promise<DepotModel[]>;
  findByItvCdn(itvCdn: number): Promise<DepotModel[]>;
}

export const DepotGateway = Symbol('DepotGateway');
