import { ControleModel, ControleModelWithoutDepot, CreateControleModel } from './controle.model';

export interface ControleGateway {
  findById(id: string): Promise<ControleModel | null>;
  findByDepotId(depotId: string): Promise<ControleModelWithoutDepot[]>;
  findByUserId(userId: string): Promise<ControleModel[]>;
  createControle(data: CreateControleModel): Promise<ControleModel>;
  createControles(data: CreateControleModel[]): Promise<ControleModel[]>;
  updateControle(id: string, data: Partial<ControleModel>): Promise<ControleModel | null>;
  findAll(): Promise<ControleModel[]>;
}

export const ControleGateway = Symbol('ControleGateway');
