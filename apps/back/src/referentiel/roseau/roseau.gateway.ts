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
  findAgaById(id: number): Promise<AgaEntity | null>;
  findSclById(id: number): Promise<SclEntity | null>;
  findSclBySandreCda(sandreCda: string): Promise<SclEntity | null>;
  findSteuById(id: number): Promise<SteuEntity | null>;
  findSteuBySandreCda(sandreCda: string): Promise<SteuEntity | null>;
  findCxnAdmBySteuAndItv(steuCdn: number, itvCdn: number): Promise<CxnadmEntity | null>;
  findCxnAdmByExpSteuAndItv(steuCdn: number, itvCdn: number): Promise<CxnadmEntity | null>;
  findPmoBySteuAndNumero(steuCdn: number, pmoNo: string): Promise<PmoEntity | null>;
  findPmoBySteuNumeroAndLocPoint(
    cdOuvrageDepollution: string,
    numeroPointMesure: string,
    codeLocPoint: string,
  ): Promise<PmoEntity | null>;
  findTlrefByRfaAndCda(trlRfa: string, tlrefEltCda: string): Promise<TlrefEntity | null>;
  findCxnTechBySclAndAga(sclCdn: number, agaZgcCdn: number): Promise<CxntechEntity | null>;
  isSystemeCollecteLinkedToAgglomeration(
    cdSystemeCollecte: string,
    cdAgglomerationAssainissement: string,
  ): Promise<boolean>;
  findCapaciteNominaleBySteuSandreAndYear(steuSandreCda: string, year: number): Promise<number | null>;
  findConcentrationMoyenneAnnuelle(
    steuSandreCda: string,
    year: number,
    parametreCodes: string[],
  ): Promise<Map<string, number>>;
  findMaxDebitReference(steuSandreCda: string): Promise<number | null>;
  findChargeEntranteMaxAndTranche(
    steuSandreCda: string,
    year: number,
  ): Promise<{ chargeMax: number; trancheLabel: string; trancheRfa: string } | null>;
}

export const RoseauGateway = Symbol('RoseauGateway');
