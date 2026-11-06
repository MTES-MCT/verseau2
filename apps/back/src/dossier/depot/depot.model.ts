import { EtapeMetier } from '@lib/dossier';
import { DepotEntity } from './depot.entity';
import type { AntivirusAnalysisModel } from './antivirusAnalysis.model';

export type DepotModel = Pick<
  DepotEntity,
  | 'id'
  | 'nomOriginalFichier'
  | 'tailleFichier'
  | 'path'
  | 'uploadExpiresAt'
  | 'rapportPath'
  | 'type'
  | 'error'
  | 'step'
  | 'stepHistory'
  | 'status'
  | 'controleStatus'
  | 'controleSandreStatus'
  | 'itvCdn'
  | 'user'
  | 'userId'
  | 'createdAt'
  | 'updatedAt'
  | 'masa'
> & { etapeMetier?: EtapeMetier; antivirusAnalysis?: AntivirusAnalysisModel };

export type CreateDepotModel = Omit<
  DepotModel,
  'id' | 'createdAt' | 'updatedAt' | 'step' | 'status' | 'user' | 'antivirusAnalysis'
>;
export type UpdateDepotModel = Partial<Omit<DepotEntity, 'antivirusAnalysis'>>;
