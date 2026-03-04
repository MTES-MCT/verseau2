import { EntityManager } from 'typeorm';
import { ControleModel, ControleModelWithoutDepot, CreateControleModel } from './controle.model';

export interface ControleGateway {
  findByDepotId(depotId: string): Promise<ControleModelWithoutDepot[]>;
  findControlesV2ByDepotId(depotId: string): Promise<ControleModelWithoutDepot[]>;
  createControle(data: CreateControleModel): Promise<ControleModel>;
  createControles(data: CreateControleModel[], manager?: EntityManager): Promise<ControleModel[]>;
}

export const ControleGateway = Symbol('ControleGateway');
