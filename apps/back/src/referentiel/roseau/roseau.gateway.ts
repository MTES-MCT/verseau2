import { SteuEntity } from './entities/steu.entity';
import { CxnadmEntity } from './entities/cxnadm.entity';
import { TlrefEntity } from './entities/tlref.entity';
import {
  SclDetailRow,
  SteuDetailRow,
  CmaBySandreCdaAndParam,
  CapaciteNominaleBySandreCda,
  MaxDebitBySandreCda,
  ChargeEntranteMaxComparison,
  PointMesure,
  ParametreMesure,
  NomenclatureItem,
  ProductionBoueZero,
  SclRef,
  SteuRef,
} from '@masa/masa.dto';

export interface RoseauGateway {
  findSteu(): Promise<SteuEntity[]>;
  findSteuBySandreCda(sandreCda: string): Promise<SteuEntity | null>;
  findSteusBySandreCdas(sandreCdas: string[], search?: string, limit?: number): Promise<SteuRef[]>;
  findSclsBySandreCdas(sandreCdas: string[], search?: string, limit?: number): Promise<SclRef[]>;
  findCxnAdmBySteuAndItv(steuCdn: number, itvCdn: number): Promise<CxnadmEntity | null>;
  checkExpSteuLinksBatch(links: { steuCdn: number; itvCdn: number }[]): Promise<Set<string>>;
  checkPmoExistenceBatch(queries: { cdSteu: string; numPmo: string; locPoint: string }[]): Promise<Set<string>>;
  checkSclAgglomerationLinksBatch(links: { cdScl: string; cdAga: string }[]): Promise<Set<string>>;
  findTlrefByRfaAndCda(trlRfa: string, tlrefEltCda: string): Promise<TlrefEntity | null>;
  findCapaciteNominaleBySteuSandreAndYear(steuSandreCda: string, year: number): Promise<number | null>;
  findCapaciteNominaleBatch(steuSandreCdas: string[], year: number): Promise<CapaciteNominaleBySandreCda[]>;
  findConcentrationsMoyennesAnnuellesBatch(
    steuSandreCdas: string[],
    year: number,
    parametreCodes: string[],
  ): Promise<CmaBySandreCdaAndParam[]>;
  findMaxDebitsReferenceBatch(steuSandreCdas: string[]): Promise<MaxDebitBySandreCda[]>;
  findChargeEntranteMaxComparisonBatch(steuSandreCdas: string[], year: number): Promise<ChargeEntranteMaxComparison[]>;
  findProductionBoueZeroBatch(steuSandreCdas: string[], year: number): Promise<ProductionBoueZero[]>;
  findPointsMesureBySystemesCollecte(systemeCollecteIds: number[]): Promise<PointMesure[]>;
  findPointsMesureByOuvrage(
    ouvrageType: 'steu' | 'scl',
    ouvrageCode: string,
    filters?: { localisationCodes?: string[] },
  ): Promise<PointMesure[]>;
  findSteuDetail(ouvrageDepollutionCode: string): Promise<SteuDetailRow | null>;
  findSclDetail(systemeCollecteCode: string): Promise<SclDetailRow | null>;
  findParametresByOuvrageAndPmo(
    ouvrageType: 'steu' | 'scl',
    ouvrageCode: string,
    pmoCdn?: number,
  ): Promise<ParametreMesure[]>;
  findNomenclatureByRfa(trlRfa: string): Promise<NomenclatureItem[]>;
}

export const RoseauGateway = Symbol('RoseauGateway');
