import { SteuEntity } from './entities/steu.entity';
import { CxnadmEntity } from './entities/cxnadm.entity';
import { TlrefEntity } from './entities/tlref.entity';
import {
  CmaBySandreCdaAndParam,
  CapaciteNominaleBySandreCda,
  MaxDebitBySandreCda,
  ChargeEntranteMaxComparison,
  ConformiteSclDetailRow,
  ConformiteSclFilters,
  ConformiteSclRow,
  ConformiteSteuDetailRow,
  ConformiteSteuFilters,
  ConformiteSteuRow,
  ProductionBoueZero,
  MesureFilters,
  MesureRow,
  SteuWithName,
  SclWithName,
  PointMesure,
  ParametreMesure,
  NomenclatureItem,
  PointMesureReferentielRow,
  SclCdnBySandreCda,
  SystemeCollecte,
} from '@masa/masa.dto';
import { SteuCdnBySandreCda } from '@masa/masa.dto';

export interface RoseauGateway {
  findSteu(): Promise<SteuEntity[]>;
  findSclBySandreCda(sandreCda: string): Promise<SystemeCollecte | null>;
  findSclBatchBySandreCdas(sandreCdas: string[]): Promise<SclCdnBySandreCda[]>;
  findSteuBySandreCda(sandreCda: string): Promise<SteuEntity | null>;
  findSteuBatchBySandreCdas(sandreCdas: string[]): Promise<SteuCdnBySandreCda[]>;
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
  findConformiteSteu(filters: ConformiteSteuFilters): Promise<{ data: ConformiteSteuRow[]; total: number }>;
  findConformiteScl(filters: ConformiteSclFilters): Promise<{ data: ConformiteSclRow[]; total: number }>;
  findConformiteSteuDetail(steuCdn: number, annee: number): Promise<ConformiteSteuDetailRow | null>;
  findConformiteSclDetail(sclCdn: number, annee: number): Promise<ConformiteSclDetailRow | null>;
  findEvenementTypes(): Promise<NomenclatureItem[]>;
  findPointsMesureBySystemesCollecte(systemeCollecteIds: number[]): Promise<PointMesure[]>;
  findMesures(filters: MesureFilters): Promise<{ data: MesureRow[]; total: number }>;
  findSteuWithNamesBySandreCdas(sandreCdas: string[]): Promise<SteuWithName[]>;
  findSclWithNamesBySandreCdas(sandreCdas: string[]): Promise<SclWithName[]>;
  findPointsMesureByOuvrage(ouvrageType: 'steu' | 'scl', ouvrageCode: string): Promise<PointMesure[]>;
  findParametresByOuvrageAndPmo(
    ouvrageType: 'steu' | 'scl',
    ouvrageCode: string,
    pmoCdn: number,
  ): Promise<ParametreMesure[]>;
  findNomenclatureByRfa(trlRfa: string): Promise<NomenclatureItem[]>;
  findStatuts(): Promise<NomenclatureItem[]>;
  findQualifications(): Promise<NomenclatureItem[]>;
  findPointsMesureReferentiel(
    ouvrageType: 'steu' | 'scl',
    ouvrageCode: string,
    filters: { dateDebut?: string; dateFin?: string; localisationCodes?: string[] },
  ): Promise<PointMesureReferentielRow[]>;
}

export const RoseauGateway = Symbol('RoseauGateway');
