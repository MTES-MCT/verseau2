import { SclEntity } from './entities/scl.entity';
import { SteuEntity } from './entities/steu.entity';
import { CxnadmEntity } from './entities/cxnadm.entity';
import { TlrefEntity } from './entities/tlref.entity';
import {
  CmaBySandreCdaAndParam,
  MaxDebitBySandreCda,
  ChargeEntranteMaxComparison,
  MesureFilters,
  MesureRow,
  SteuWithName,
  PointMesure,
  ParametreMesure,
} from '@masa/masa.dto';
import { SteuCdnBySandreCda } from '@masa/masa.dto';

export interface RoseauGateway {
  findSteu(): Promise<SteuEntity[]>;
  findSclBySandreCda(sandreCda: string): Promise<SclEntity | null>;
  findSteuBySandreCda(sandreCda: string): Promise<SteuEntity | null>;
  findSteuBatchBySandreCdas(sandreCdas: string[]): Promise<SteuCdnBySandreCda[]>;
  findCxnAdmBySteuAndItv(steuCdn: number, itvCdn: number): Promise<CxnadmEntity | null>;
  checkExpSteuLinksBatch(links: { steuCdn: number; itvCdn: number }[]): Promise<Set<string>>;
  checkPmoExistenceBatch(queries: { cdSteu: string; numPmo: string; locPoint: string }[]): Promise<Set<string>>;
  checkSclAgglomerationLinksBatch(links: { cdScl: string; cdAga: string }[]): Promise<Set<string>>;
  findTlrefByRfaAndCda(trlRfa: string, tlrefEltCda: string): Promise<TlrefEntity | null>;
  findCapaciteNominaleBySteuSandreAndYear(steuSandreCda: string, year: number): Promise<number | null>;
  findConcentrationsMoyennesAnnuellesBatch(
    steuSandreCdas: string[],
    year: number,
    parametreCodes: string[],
  ): Promise<CmaBySandreCdaAndParam[]>;
  findMaxDebitsReferenceBatch(steuSandreCdas: string[]): Promise<MaxDebitBySandreCda[]>;
  findChargeEntranteMaxComparisonBatch(steuSandreCdas: string[], year: number): Promise<ChargeEntranteMaxComparison[]>;
  findMesures(filters: MesureFilters): Promise<{ data: MesureRow[]; total: number }>;
  findSteuWithNamesBySandreCdas(sandreCdas: string[]): Promise<SteuWithName[]>;
  findPointsMesureBySandreCda(steuSandreCda: string): Promise<PointMesure[]>;
  findParametresBySteuAndPmo(steuSandreCda: string, pmoCdn: number): Promise<ParametreMesure[]>;
}

export const RoseauGateway = Symbol('RoseauGateway');
