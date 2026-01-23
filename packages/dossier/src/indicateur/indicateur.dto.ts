export interface IndicateurSteuDto {
  bassin: string;
  region: string;
  departement: string;
  codeSandreAgglo: string;
  nomAgglo: string;
  nature: string;
  trancheObligation: string;
  etatAgglo: string;
  tailleAggloEhAnN: number;
  sommeChargesMaxEntrantesEh: number;
  codeSandreSteu: string;
  nomSteu: string;
  capaciteNominaleEhAnN: number;
  debitReference: number;
  chargeEntranteEhAnN: number;
  pc95Retenu: number | null;
  nbAnneesMaxPc95: number;
  annee: number;
}
