import { AgaEntity } from './entities/aga.entity';
import { SclEntity } from './entities/scl.entity';
import { SteuEntity } from './entities/steu.entity';
import { CxnadmEntity } from './entities/cxnadm.entity';
import { PmoEntity } from './entities/pmo.entity';
import { TlrefEntity } from './entities/tlref.entity';
import { CxntechEntity } from './entities/cxntech.entity';

export interface RoseauGateway {
  findAga(): Promise<AgaEntity[]>;
  findScl(): Promise<SclEntity[]>;
  findSteu(): Promise<SteuEntity[]>;
  findAgaById(id: string): Promise<AgaEntity | null>;
  findSclById(id: string): Promise<SclEntity | null>;
  findSteuById(id: string): Promise<SteuEntity | null>;
  findSteuBySandreCda(sandreCda: string): Promise<SteuEntity | null>;
  findCxnAdmBySteuAndItv(steuCdn: string, itvCdn: string): Promise<CxnadmEntity | null>;
  findCxnAdmByExpSteuAndItv(steuCdn: string, itvCdn: string): Promise<CxnadmEntity | null>;
  findPmoBySteuAndNumero(steuCdn: string, pmoNo: number): Promise<PmoEntity | null>;
  findTlrefByRfaAndCda(trlRfa: string, tlrefEltCda: string): Promise<TlrefEntity | null>;
  findCxnTechBySclAndAga(sclCdn: string, agaZgcCdn: string): Promise<CxntechEntity | null>;
}

export const RoseauGateway = Symbol('RoseauGateway');
