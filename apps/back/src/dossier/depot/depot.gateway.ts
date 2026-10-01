import { DepotModel, UpdateDepotModel } from './depot.model';
import { DepotStep } from '@lib/dossier';
import { QueueName } from '@queue/queue';

export interface DepotTransitionJob {
  name: QueueName;
  data: object;
}

export interface DepotGateway {
  createDepot(depot: Partial<DepotModel>): Promise<DepotModel>;
  findDepotById(id: string): Promise<DepotModel | null>;
  findDepotByIdWithUser(id: string): Promise<DepotModel | null>;
  findAllDepotsByAdmin(): Promise<DepotModel[]>;
  updateDepot(id: string, updateData: UpdateDepotModel): Promise<DepotModel | null>;
  transitionDepot(
    id: string,
    fromSteps: DepotStep[],
    updateData: UpdateDepotModel,
    job?: DepotTransitionJob,
  ): Promise<boolean>;
  findByUserId(userId: string): Promise<DepotModel[]>;
  findByItvCdn(itvCdn: number): Promise<DepotModel[]>;
}

export const DepotGateway = Symbol('DepotGateway');
