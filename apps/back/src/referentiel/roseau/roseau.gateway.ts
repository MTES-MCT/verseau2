import { AgaEntity } from './entities/aga.entity';
import { SclEntity } from './entities/scl.entity';
import { SteuEntity } from './entities/steu.entity';

export interface RoseauGateway {
  findAga(): Promise<AgaEntity[]>;
  findScl(): Promise<SclEntity[]>;
  findSteu(): Promise<SteuEntity[]>;
  findAgaById(id: string): Promise<AgaEntity | null>;
  findSclById(id: string): Promise<SclEntity | null>;
  findSteuById(id: string): Promise<SteuEntity | null>;
}

export const RoseauGateway = Symbol('RoseauGateway');
