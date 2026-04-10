import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { RoseauGateway } from './roseau.gateway';
import { AgaEntity } from './entities/aga.entity';
import { SclEntity } from './entities/scl.entity';
import { SteuEntity } from './entities/steu.entity';
import { CxnadmEntity } from './entities/cxnadm.entity';
import { PmoEntity } from './entities/pmo.entity';
import { TlrefEntity } from './entities/tlref.entity';
import { CxntechEntity } from './entities/cxntech.entity';
import { CpyEntity } from './entities/cpy.entity';
import { ResaEntity } from './entities/resa.entity';
import { StchanEntity } from './entities/stchan.entity';
import { TltoblEntity } from './entities/tltobl.entity';
import { AgacEntity } from './entities/agac.entity';
import { PleEntity } from './entities/ple.entity';
import { AlrEntity } from './entities/alr.entity';
import { PabEntity } from './entities/pab.entity';
import { OrmEntity } from './entities/orm.entity';
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
  EvenementSteuFilters,
  EvenementSteuRow,
  EvenementSclFilters,
  EvenementSclRow,
  BilanSteuFilters,
  BilanSteuRow,
  BilanSclFilters,
  BilanSclRow,
  TransmissionASRetardSteuFilters,
  TransmissionASRetardSteuRow,
  TransmissionASRetardSclFilters,
  TransmissionASRetardSclRow,
  SystemeCollecte,
} from '@masa/masa.dto';
import { SteuCdnBySandreCda } from '@masa/masa.dto';
import { ParEntity } from '@referentiel/lanceleau/entities/par.entity';
import { UrfEntity } from '@referentiel/lanceleau/entities/urf.entity';
import { toISODateOrNull } from '@lib/shared';

interface TransmissionASRetardSteuRawRow {
  code_sandre: string;
  nom: string | null;
  tranche_obligation: string | null;
  capacite_nominale: number | null;
  nb_fichiers_as_recus: number | null;
  date_dernier_fichier_recu: Date | string | null;
  date_debut_periode: Date | string | null;
  date_fin_periode: Date | string | null;
  date_mesure_suivante_attendue: Date | string | null;
  nb_jours_retard: number | null;
  exploitant_nom: string | null;
  exploitant_email: string | null;
  exploitant_date_envoi_mail: Date | string | null;
}

type TransmissionASRetardSclRawRow = TransmissionASRetardSteuRawRow;

interface ConformiteSteuRawRow {
  steu_cdn: number | string;
  ouvrage_depollution_code: string;
  ouvrage_depollution_nom: string | null;
  tranche_obligation_libelle: string | null;
  capacite_nominale_eh: number | string | null;
  suivi_debut_date: Date | string | null;
  suivi_fin_date: Date | string | null;
  conformite_nationale_provisoire: string | null;
  conformite_locale_provisoire: string | null;
  impact_conformite: boolean;
  suivi_regulier_effectue: boolean | null;
  suivi_regulier_date: Date | string | null;
}

interface ConformiteSclRawRow {
  scl_cdn: number | string;
  systeme_collecte_code: string;
  systeme_collecte_nom: string | null;
  tranche_obligation_libelle: string | null;
  type_scl: string | null;
  suivi_debut_date: Date | string | null;
  suivi_fin_date: Date | string | null;
  conformite_locale_temps_pluie_provisoire: string | null;
  conformite_nationale_temps_pluie_provisoire: string | null;
  impact_conformite: boolean;
  suivi_regulier_effectue: boolean | null;
  suivi_regulier_date: Date | string | null;
}

interface ConformiteSteuDetailRawRow {
  conf_loc_per_nb: number | string | null;
  conf_loc_an_nb: number | string | null;
  non_conf_loc_per_nb: number | string | null;
  non_conf_loc_an_nb: number | string | null;
  redh_loc_per_nb: number | string | null;
  redh_loc_an_nb: number | string | null;
  conf_loc_per_lb: string | null;
  conf_loc_an_lb: string | null;
  non_conf_loc_per_lb: string | null;
  non_conf_loc_an_lb: string | null;
  redh_loc_per_lb: string | null;
  redh_loc_an_lb: string | null;
  conf_nat_per_nb: number | string | null;
  conf_nat_an_nb: number | string | null;
  non_conf_nat_per_nb: number | string | null;
  non_conf_nat_an_nb: number | string | null;
  redh_nat_per_nb: number | string | null;
  redh_nat_an_nb: number | string | null;
  conf_nat_per_lb: string | null;
  conf_nat_an_lb: string | null;
  non_conf_nat_per_lb: string | null;
  non_conf_nat_an_lb: string | null;
  redh_nat_per_lb: string | null;
  redh_nat_an_lb: string | null;
  hcnf_per_nb: number | string | null;
  hcnf_an_nb: number | string | null;
  hcts_per_nb: number | string | null;
  hcts_an_nb: number | string | null;
  hcnf_per_lb: string | null;
  hcnf_an_lb: string | null;
  hcts_per_lb: string | null;
  hcts_an_lb: string | null;
  evt_per_nb: number | string | null;
  evt_an_nb: number | string | null;
}

interface ConformiteSclDetailRawRow {
  volume_deverse_periode_pc: number | string | null;
  volume_deverse_annee_pc: number | string | null;
  conformite_volume_periode: string | null;
  conformite_volume_annee: string | null;
  flux_deverse_periode_pc: number | string | null;
  flux_deverse_annee_pc: number | string | null;
  conformite_flux_periode: string | null;
  conformite_flux_annee: string | null;
  jours_deversement_periode_nb: number | string | null;
  jours_deversement_annee_nb: number | string | null;
  conformite_jours_deversement_periode: string | null;
  conformite_jours_deversement_annee: string | null;
}

@Injectable()
export class RoseauRepository implements RoseauGateway {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(AgaEntity)
    private readonly agaRepository: Repository<AgaEntity>,
    @InjectRepository(SclEntity)
    private readonly sclRepository: Repository<SclEntity>,
    @InjectRepository(SteuEntity)
    private readonly steuRepository: Repository<SteuEntity>,
    @InjectRepository(CxnadmEntity)
    private readonly cxnadmRepository: Repository<CxnadmEntity>,
    @InjectRepository(PmoEntity)
    private readonly pmoRepository: Repository<PmoEntity>,
    @InjectRepository(TlrefEntity)
    private readonly tlrefRepository: Repository<TlrefEntity>,
    @InjectRepository(CpyEntity)
    private readonly cpyRepository: Repository<CpyEntity>,
    @InjectRepository(ResaEntity)
    private readonly resaRepository: Repository<ResaEntity>,
    @InjectRepository(StchanEntity)
    private readonly stchanRepository: Repository<StchanEntity>,
    @InjectRepository(AlrEntity)
    private readonly alrRepository: Repository<AlrEntity>,
    @InjectRepository(PabEntity)
    private readonly pabRepository: Repository<PabEntity>,
  ) {}

  async findSteu(): Promise<SteuEntity[]> {
    return this.steuRepository.find();
  }

  async findSclBySandreCda(sandreCda: string): Promise<SystemeCollecte | null> {
    const scl = await this.sclRepository.findOne({ where: { sclSandreCda: sandreCda } });
    if (!scl) return null;
    return {
      systemeCollecteId: scl.sclCdn,
      systemeCollecteCode: scl.sclSandreCda,
      systemeCollecteNom: scl.sclLb,
    };
  }

  async findSclBatchBySandreCdas(sandreCdas: string[]): Promise<SclCdnBySandreCda[]> {
    if (sandreCdas.length === 0) return [];

    const rows = await this.sclRepository
      .createQueryBuilder('s')
      .where('s.scl_sandre_cda IN (:...sandreCdas)', { sandreCdas })
      .getMany();

    return rows.map((scl) => ({
      systemeCollecteCode: scl.sclSandreCda,
      systemeCollecteId: scl.sclCdn,
    }));
  }

  async findSteuBySandreCda(sandreCda: string): Promise<SteuEntity | null> {
    return this.steuRepository.findOne({ where: { steuSandreCda: sandreCda } });
  }

  async findSteuBatchBySandreCdas(sandreCdas: string[]): Promise<SteuCdnBySandreCda[]> {
    if (sandreCdas.length === 0) return [];
    const rows = await this.steuRepository
      .createQueryBuilder('s')
      .where('s.steu_sandre_cda IN (:...sandreCdas)', { sandreCdas })
      .getMany();
    return rows.map((s) => ({
      ouvrageDepollutionCode: s.steuSandreCda,
      ouvrageDepollutionId: s.steuCdn,
    }));
  }

  async findCxnAdmBySteuAndItv(steuCdn: number, itvCdn: number): Promise<CxnadmEntity | null> {
    return this.cxnadmRepository.findOne({ where: { moSteuCdn: steuCdn, steuItvCdn: itvCdn } });
  }

  async checkExpSteuLinksBatch(links: { steuCdn: number; itvCdn: number }[]): Promise<Set<string>> {
    if (links.length === 0) return new Set();
    const rows = await this.cxnadmRepository
      .createQueryBuilder('a')
      .select('a.exp_steu_cdn', 'steu_cdn')
      .addSelect('a.steu_itv_cdn', 'itv_cdn')
      .where(
        links.map((_, i) => `(a.exp_steu_cdn = :steu${i} AND a.steu_itv_cdn = :itv${i})`).join(' OR '),
        Object.fromEntries(
          links.flatMap(({ steuCdn, itvCdn }, i) => [
            [`steu${i}`, steuCdn],
            [`itv${i}`, itvCdn],
          ]),
        ),
      )
      .getRawMany<{ steu_cdn: number; itv_cdn: number }>();
    return new Set(rows.map((r) => `${r.steu_cdn}:${r.itv_cdn}`));
  }

  async checkPmoExistenceBatch(queries: { cdSteu: string; numPmo: string; locPoint: string }[]): Promise<Set<string>> {
    if (queries.length === 0) return new Set();
    const rows = await this.pmoRepository
      .createQueryBuilder('pmo')
      .select('s.steu_sandre_cda', 'steu_sandre_cda')
      .addSelect('pmo.pmo_no', 'pmo_no')
      .addSelect('t16.tlref_elt_cda', 'loc_point')
      .innerJoin(SteuEntity, 's', 's.steu_cdn = pmo.steu_cdn')
      .innerJoin(TlrefEntity, 't16', 't16.tlref_cdn = pmo.tlref_16_cdn')
      .where('s.steu_sandre_cda IN (:...cdSteus)', {
        cdSteus: [...new Set(queries.map((q) => q.cdSteu))],
      })
      .getRawMany<{ steu_sandre_cda: string; pmo_no: string; loc_point: string }>();

    const existing = new Set(rows.map((r) => `${r.steu_sandre_cda.trim()}:${r.pmo_no.trim()}:${r.loc_point.trim()}`));
    const result = new Set<string>();
    for (const { cdSteu, numPmo, locPoint } of queries) {
      if (existing.has(`${cdSteu}:${numPmo}:${locPoint}`)) {
        result.add(`${cdSteu}:${numPmo}:${locPoint}`);
      }
    }
    return result;
  }

  async findTlrefByRfaAndCda(trlRfa: string, tlrefEltCda: string): Promise<TlrefEntity | null> {
    return this.tlrefRepository.findOne({ where: { trlRfa: trlRfa, tlrefEltCda: tlrefEltCda } });
  }

  async checkSclAgglomerationLinksBatch(links: { cdScl: string; cdAga: string }[]): Promise<Set<string>> {
    if (links.length === 0) return new Set();
    const cdScls = [...new Set(links.map((l) => l.cdScl))];
    const cdAgas = [...new Set(links.map((l) => l.cdAga))];
    const rows = await this.sclRepository
      .createQueryBuilder('scl')
      .select('scl.scl_sandre_cda', 'cd_scl')
      .addSelect('aga.aga_sandre_cda', 'cd_aga')
      .innerJoin(AgaEntity, 'aga', 'aga.aga_sandre_cda IN (:...cdAgas)', { cdAgas })
      .innerJoin(
        CxntechEntity,
        'cxntech',
        'cxntech.aval_scl_cdn = scl.scl_cdn AND cxntech.amont_zgc_cdn = aga.zgc_cdn AND cxntech.cxntech_retrait_dt IS NULL',
      )
      .where('scl.scl_sandre_cda IN (:...cdScls)', { cdScls })
      .getRawMany<{ cd_scl: string; cd_aga: string }>();
    return new Set(rows.map((r) => `${r.cd_scl.trim()}:${r.cd_aga.trim()}`));
  }

  async findCapaciteNominaleBySteuSandreAndYear(steuSandreCda: string, year: number): Promise<number | null> {
    const result = await this.cpyRepository
      .createQueryBuilder('cpy')
      .select('cpy.cpy_eh_trait_nom_cap_mt', 'capacite_nominale')
      .innerJoin(SteuEntity, 'steu', 'steu.steu_cdn = cpy.steu_cdn')
      .where('steu.steu_sandre_cda = :steuSandreCda', { steuSandreCda })
      .andWhere('cpy.cpy_an = :year', { year })
      .getRawOne<{ capacite_nominale: number | null }>();
    return result?.capacite_nominale ?? null;
  }

  async findCapaciteNominaleBatch(steuSandreCdas: string[], year: number): Promise<CapaciteNominaleBySandreCda[]> {
    if (steuSandreCdas.length === 0) {
      return [];
    }

    const rows = await this.cpyRepository
      .createQueryBuilder('cpy')
      .select('steu.steu_sandre_cda', 'steu_sandre_cda')
      .addSelect('cpy.cpy_eh_trait_nom_cap_mt', 'capacite_nominale')
      .innerJoin(SteuEntity, 'steu', 'steu.steu_cdn = cpy.steu_cdn')
      .where('steu.steu_sandre_cda IN (:...steuSandreCdas)', { steuSandreCdas })
      .andWhere('cpy.cpy_an = :year', { year })
      .getRawMany<{ steu_sandre_cda: string; capacite_nominale: number | null }>();

    return rows
      .filter((row) => row.capacite_nominale !== null)
      .map((row) => ({
        ouvrageDepollutionCode: row.steu_sandre_cda.trim(),
        ouvrageDepollutionCapaciteNominaleEH: row.capacite_nominale!,
      }));
  }

  async findConcentrationsMoyennesAnnuellesBatch(
    steuSandreCdas: string[],
    year: number,
    parametreCodes: string[],
  ): Promise<CmaBySandreCdaAndParam[]> {
    if (steuSandreCdas.length === 0 || parametreCodes.length === 0) {
      return [];
    }

    const rows = await this.resaRepository
      .createQueryBuilder('r')
      .select('s.steu_sandre_cda', 'steu_sandre_cda')
      .addSelect('r.par_rfa', 'par_rfa')
      .addSelect('r.resa_cma_val', 'resa_cma_val')
      .innerJoin(SteuEntity, 's', 's.steu_cdn = r.steu_cdn')
      .where('s.steu_sandre_cda IN (:...steuSandreCdas)', { steuSandreCdas })
      .andWhere('r.resa_an = :year', { year })
      .andWhere('r.par_rfa IN (:...parametreCodes)', { parametreCodes })
      .getRawMany<{ steu_sandre_cda: string; par_rfa: string; resa_cma_val: string }>();

    return rows.map((row) => ({
      ouvrageDepollutionCode: row.steu_sandre_cda.trim(),
      parametreAnalyseCode: row.par_rfa.trim(),
      resultatAnnuelConcentrationMoyenne: parseFloat(row.resa_cma_val),
    }));
  }

  async findMaxDebitsReferenceBatch(steuSandreCdas: string[]): Promise<MaxDebitBySandreCda[]> {
    if (steuSandreCdas.length === 0) {
      return [];
    }

    const rows = await this.stchanRepository
      .createQueryBuilder('t')
      .select('s.steu_sandre_cda', 'steu_sandre_cda')
      .addSelect('t.stchan_pc95_val', 'pc95')
      .addSelect('c.cpy_ref_debit_mt', 'dref')
      .innerJoin(SteuEntity, 's', 's.steu_cdn = t.steu_cdn')
      .innerJoin(CpyEntity, 'c', 'c.steu_cdn = s.steu_cdn')
      .where('s.steu_sandre_cda IN (:...steuSandreCdas)', { steuSandreCdas })
      .andWhere('t.stchan_an = s.steu_encours_an')
      .andWhere('c.cpy_an = s.steu_encours_an')
      .getRawMany<{ steu_sandre_cda: string; pc95: number | null; dref: number | null }>();

    const result: MaxDebitBySandreCda[] = [];
    for (const row of rows) {
      const pc95 = row.pc95 ? parseFloat(row.pc95.toString()) : 0;
      const dref = row.dref ? parseFloat(row.dref.toString()) : 0;
      const ouvrageDepollutionDebitMaximalReference = Math.max(pc95, dref);
      if (ouvrageDepollutionDebitMaximalReference > 0) {
        result.push({ ouvrageDepollutionCode: row.steu_sandre_cda.trim(), ouvrageDepollutionDebitMaximalReference });
      }
    }
    return result;
  }

  async findChargeEntranteMaxComparisonBatch(
    steuSandreCdas: string[],
    year: number,
  ): Promise<ChargeEntranteMaxComparison[]> {
    if (steuSandreCdas.length === 0) {
      return [];
    }

    const rows = await this.stchanRepository
      .createQueryBuilder('cn')
      .select('s.steu_sandre_cda', 'steu_sandre_cda')
      .addSelect('cn.stchan_r_eh_max_chg_val', 'charge_max_n')
      .addSelect('cn1.stchan_r_eh_max_chg_val', 'charge_max_n1')
      .addSelect('t.tltobl_lb', 'tranche_label')
      .addSelect('cn.stchan_an', 'annee')
      .innerJoin(SteuEntity, 's', 's.steu_cdn = cn.steu_cdn')
      .innerJoin(AgaEntity, 'a', 'a.zgc_cdn = s.zgc_cdn')
      .innerJoin(AgacEntity, 'ac', 'ac.aga_cdn = a.aga_cdn AND ac.agac_conf_an = :year', { year })
      .innerJoin(TltoblEntity, 't', 't.tltobl_rfa = a.tltobl_rfa')
      .leftJoin(StchanEntity, 'cn1', 'cn1.steu_cdn = cn.steu_cdn AND cn1.stchan_an = cn.stchan_an - 1')
      .where('s.steu_sandre_cda IN (:...steuSandreCdas)', { steuSandreCdas })
      .andWhere('cn.stchan_an = :year', { year })
      .andWhere('cn.stchan_r_eh_max_chg_val IS NOT NULL')
      .andWhere('cn1.stchan_r_eh_max_chg_val IS NOT NULL')
      .andWhere('cn1.stchan_r_eh_max_chg_val != 0')
      .getRawMany<{
        steu_sandre_cda: string;
        charge_max_n: number;
        charge_max_n1: number;
        tranche_label: string;
        annee: number;
      }>();

    return rows.map((r) => ({
      ouvrageDepollutionCode: r.steu_sandre_cda.trim(),
      chargeEntranteMaximaleEHN: parseFloat(r.charge_max_n.toString()),
      chargeEntranteMaximaleEHNMoins1: parseFloat(r.charge_max_n1.toString()),
      trancheObligationLibelle: r.tranche_label.trim(),
      bilanReferenceAnnee: parseInt(r.annee.toString(), 10),
    }));
  }

  async findProductionBoueZeroBatch(steuSandreCdas: string[], year: number): Promise<ProductionBoueZero[]> {
    if (steuSandreCdas.length === 0) {
      return [];
    }

    const rows = await this.pabRepository
      .createQueryBuilder('pab')
      .select('s.steu_sandre_cda', 'steu_sandre_cda')
      .addSelect('pab.pab_an', 'pab_an')
      .addSelect('pab.pab_an_reac_hors_prod_r_val', 'production_boue')
      .innerJoin(SteuEntity, 's', 's.steu_cdn = pab.steu_cdn')
      .where('s.steu_sandre_cda IN (:...steuSandreCdas)', { steuSandreCdas })
      .andWhere('pab.pab_an = :year', { year })
      .andWhere('pab.pab_an_reac_hors_prod_r_val = 0')
      .andWhere(
        `NOT EXISTS (
          SELECT 1
          FROM roseau.file f
          JOIN roseau.tlref t28 ON t28.tlref_cdn = f.tlref_28_cdn AND t28.tlref_elt_cda = '2'
          JOIN roseau.filiere fil ON fil.file_cdn = f.file_cdn
          JOIN roseau.tlref t29 ON t29.tlref_cdn = fil.tlref_29_cdn AND t29.tlref_elt_cda IN ('A5','A4','A6','BB','B1','D5','D6')
          WHERE f.steu_cdn = s.steu_cdn
        )`,
      )
      .getRawMany<{ steu_sandre_cda: string; pab_an: number; production_boue: number }>();

    return rows.map((r) => ({
      ouvrageDepollutionCode: r.steu_sandre_cda.trim(),
      boueProductionAnnee: parseInt(r.pab_an.toString(), 10),
      boueProductionAnnuelle: parseFloat(r.production_boue.toString()),
    }));
  }

  async findConformiteSteu(filters: ConformiteSteuFilters): Promise<{ data: ConformiteSteuRow[]; total: number }> {
    const { ouvrageDepollutionIds, year, trancheObligationRfa, impact, page, pageSize } = filters;

    if (ouvrageDepollutionIds.length === 0) {
      return { data: [], total: 0 };
    }

    const annee = year;
    const sortBy = filters.sortBy ?? 'ouvrageDepollutionCode';
    const sortOrder = filters.sortOrder ?? 'ASC';

    const sortMap: Record<NonNullable<ConformiteSteuFilters['sortBy']>, string> = {
      ouvrageDepollutionCode: 'ouvrage_depollution_code',
      ouvrageDepollutionNom: 'ouvrage_depollution_nom',
      trancheObligationLibelle: 'tranche_obligation_libelle',
      capaciteNominaleEH: 'capacite_nominale_eh',
      conformiteNationaleProvisoire: 'conformite_nationale_provisoire',
      conformiteLocaleProvisoire: 'conformite_locale_provisoire',
    };

    const sortColumn = sortMap[sortBy];

    if (!sortColumn) {
      throw new Error(`Invalid sortBy value: "${sortBy}"`);
    }

    const queryParams: Array<number | string | boolean> = [];
    const addParam = (value: number | string | boolean) => {
      queryParams.push(value);
      return `$${queryParams.length}`;
    };

    const anneePlaceholder = addParam(annee);
    const steuPlaceholders = ouvrageDepollutionIds.map((steuCdn) => addParam(steuCdn)).join(', ');
    const whereClauses = [`steu.steu_cdn IN (${steuPlaceholders})`];

    if (trancheObligationRfa) {
      whereClauses.push(`tltobl.tltobl_rfa = ${addParam(trancheObligationRfa)}`);
    }

    const impactFilter = impact ? `WHERE impact_conformite = ${addParam(impact === 'avec')}` : '';

    const baseQuery = `
      WITH params AS (SELECT ${anneePlaceholder}::int AS annee),
      base_data AS (
        SELECT
          steu.steu_cdn AS steu_cdn,
          RTRIM(steu.steu_sandre_cda) AS ouvrage_depollution_code,
          steu.steu_nom_lb AS ouvrage_depollution_nom,
          tltobl.tltobl_lb AS tranche_obligation_libelle,
          cpy.cpy_eh_trait_nom_cap_mt AS capacite_nominale_eh,
          steureg.steureg_suiv_deb_dt AS suivi_debut_date,
          steureg.steureg_suiv_fin_dt AS suivi_fin_date,
          cfprf.cfprf_r_glob_perf_eru_conf_in AS conformite_nationale_provisoire,
          cfprf.cfprf_r_glob_perf_loc_conf_in AS conformite_locale_provisoire,
          CASE
            WHEN cfprf.cfprf_r_glob_perf_eru_conf_in IS NULL
              AND cfprf.cfprf_r_glob_perf_loc_conf_in IS NULL
            THEN false
            WHEN cfprf.cfprf_r_glob_perf_eru_conf_in <> steureg.steureg_per_nat_conf_in
              OR cfprf.cfprf_r_glob_perf_loc_conf_in <> steureg.steureg_per_loc_conf_in
            THEN true
            ELSE false
          END AS impact_conformite,
          steureg.steureg_suivi_reg_on AS suivi_regulier_effectue,
          steureg.steureg_suivi_reg_dt AS suivi_regulier_date
        FROM roseau.steu steu
        JOIN roseau.cxntech cxn ON cxn.aval_steu_cdn = steu.steu_cdn
          AND cxn.amont_zgc_cdn IS NOT NULL
          AND DATE_PART('year', cxn.cxntech_creation_dt) <= (SELECT annee FROM params)
          AND (cxn.cxntech_retrait_dt IS NULL OR DATE_PART('year', cxn.cxntech_retrait_dt) >= (SELECT annee FROM params))
        JOIN roseau.aga aga ON aga.zgc_cdn = cxn.amont_zgc_cdn
        JOIN roseau.trobl trobl ON trobl.aga_cdn = aga.aga_cdn
          AND DATE_PART('year', trobl.trobl_val_deb_dt) <= (SELECT annee FROM params)
          AND (trobl.trobl_val_fin_dt IS NULL OR DATE_PART('year', trobl.trobl_val_fin_dt) >= (SELECT annee FROM params))
        JOIN roseau.tltobl tltobl ON tltobl.tltobl_rfa = trobl.tltobl_rfa
        JOIN roseau.cpy cpy ON cpy.steu_cdn = steu.steu_cdn
          AND ((cpy.cpy_an = (SELECT annee FROM params) AND steu.steu_encours_an = (SELECT annee FROM params))
            OR (cpy.cpy_an = steu.steu_encours_an AND steu.steu_encours_an < (SELECT annee FROM params)))
        JOIN roseau.cfprf cfprf ON cfprf.steu_cdn = steu.steu_cdn
          AND ((cfprf.cfprf_an = (SELECT annee FROM params) AND steu.steu_encours_an = (SELECT annee FROM params))
            OR (cfprf.cfprf_an = steu.steu_encours_an AND steu.steu_encours_an < (SELECT annee FROM params)))
        JOIN roseau.steureg steureg ON steureg.steu_cdn = steu.steu_cdn
          AND steureg.steureg_an = (SELECT annee FROM params)
        WHERE ${whereClauses.join(' AND ')}
      ),
      filtered_data AS (
        SELECT *
        FROM base_data
        ${impactFilter}
      )
    `;

    const countRows = await this.dataSource.query<{ total: number | string }[]>(
      `${baseQuery}
       SELECT COUNT(*)::int AS total
       FROM filtered_data`,
      queryParams,
    );

    const dataQueryParams = [...queryParams];
    dataQueryParams.push(pageSize);
    const limitPlaceholder = `$${dataQueryParams.length}`;
    dataQueryParams.push((page - 1) * pageSize);
    const offsetPlaceholder = `$${dataQueryParams.length}`;

    const rows = await this.dataSource.query<ConformiteSteuRawRow[]>(
      `${baseQuery}
       SELECT
         steu_cdn,
         ouvrage_depollution_code,
         ouvrage_depollution_nom,
         tranche_obligation_libelle,
         capacite_nominale_eh,
         suivi_debut_date,
         suivi_fin_date,
         conformite_nationale_provisoire,
         conformite_locale_provisoire,
         impact_conformite,
         suivi_regulier_effectue,
         suivi_regulier_date
       FROM filtered_data
       ORDER BY ${sortColumn} ${sortOrder}, ouvrage_depollution_code ASC
       LIMIT ${limitPlaceholder}
       OFFSET ${offsetPlaceholder}`,
      dataQueryParams,
    );

    return {
      data: rows.map((row) => ({
        steuCdn: Number(row.steu_cdn),
        ouvrageDepollutionCode: row.ouvrage_depollution_code?.trim() ?? '',
        ouvrageDepollutionNom: row.ouvrage_depollution_nom?.trim() ?? null,
        trancheObligationLibelle: row.tranche_obligation_libelle?.trim() ?? null,
        capaciteNominaleEH:
          row.capacite_nominale_eh !== null && row.capacite_nominale_eh !== undefined
            ? Number(row.capacite_nominale_eh)
            : null,
        suiviDebutDate: toISODateOrNull(row.suivi_debut_date),
        suiviFinDate: toISODateOrNull(row.suivi_fin_date),
        conformiteNationaleProvisoire: row.conformite_nationale_provisoire?.trim() ?? null,
        conformiteLocaleProvisoire: row.conformite_locale_provisoire?.trim() ?? null,
        impactConformite: row.impact_conformite,
        suiviRegulierEffectue: row.suivi_regulier_effectue,
        suiviRegulierDate: toISODateOrNull(row.suivi_regulier_date),
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async findConformiteScl(filters: ConformiteSclFilters): Promise<{ data: ConformiteSclRow[]; total: number }> {
    const { ouvrageDepollutionIds, year, trancheObligationRfa, impact, page, pageSize } = filters;

    if (ouvrageDepollutionIds.length === 0) {
      return { data: [], total: 0 };
    }

    const sortBy = filters.sortBy ?? 'systemeCollecteCode';
    const sortOrder = filters.sortOrder ?? 'ASC';

    const sortMap: Record<NonNullable<ConformiteSclFilters['sortBy']>, string> = {
      systemeCollecteCode: 'systeme_collecte_code',
      systemeCollecteNom: 'systeme_collecte_nom',
      trancheObligationLibelle: 'tranche_obligation_libelle',
      typeScl: 'type_scl',
      conformiteLocaleTempsPluieProvisoire: 'conformite_locale_temps_pluie_provisoire',
      conformiteNationaleTempsPluieProvisoire: 'conformite_nationale_temps_pluie_provisoire',
    };

    const sortColumn = sortMap[sortBy];

    if (!sortColumn) {
      throw new Error(`Invalid sortBy value: "${sortBy}"`);
    }

    const queryParams: Array<number | string | boolean> = [];
    const addParam = (value: number | string | boolean) => {
      queryParams.push(value);
      return `$${queryParams.length}`;
    };

    const anneePlaceholder = addParam(year);
    const steuPlaceholders = ouvrageDepollutionIds.map((steuCdn) => addParam(steuCdn)).join(', ');
    const whereClauses = [`steu.steu_cdn IN (${steuPlaceholders})`];

    if (trancheObligationRfa) {
      whereClauses.push(`tltobl.tltobl_rfa = ${addParam(trancheObligationRfa)}`);
    }

    const impactFilter = impact ? `WHERE impact_conformite = ${addParam(impact === 'avec')}` : '';

    const baseQuery = `
      WITH params AS (SELECT ${anneePlaceholder}::int AS annee),
      base_data AS (
        SELECT
          scl.scl_cdn AS scl_cdn,
          RTRIM(scl.scl_sandre_cda) AS systeme_collecte_code,
          scl.scl_lb AS systeme_collecte_nom,
          tltobl.tltobl_lb AS tranche_obligation_libelle,
          t05.tlref_mnemo_lb AS type_scl,
          sclreg.sclreg_suiv_deb_dt AS suivi_debut_date,
          sclreg.sclreg_suiv_fin_dt AS suivi_fin_date,
          bil.bilanscl_conf_tp_eru_in AS conformite_locale_temps_pluie_provisoire,
          bil.bilanscl_conf_nat_tp_eru_in AS conformite_nationale_temps_pluie_provisoire,
          CASE
            WHEN bil.bilanscl_conf_tp_eru_in <> sclreg.sclreg_per_nat_tp_conf_in
            THEN true
            ELSE false
          END AS impact_conformite,
          sclreg.sclreg_suivi_reg_on AS suivi_regulier_effectue,
          sclreg.sclreg_suivi_reg_dt AS suivi_regulier_date
        FROM roseau.scl scl
        JOIN roseau.steu steu ON steu.steu_cdn = scl.steu_cdn
        JOIN roseau.cxntech cxn ON cxn.aval_steu_cdn = steu.steu_cdn
          AND cxn.amont_zgc_cdn IS NOT NULL
          AND DATE_PART('year', cxn.cxntech_creation_dt) <= (SELECT annee FROM params)
          AND (cxn.cxntech_retrait_dt IS NULL OR DATE_PART('year', cxn.cxntech_retrait_dt) >= (SELECT annee FROM params))
        JOIN roseau.aga aga ON aga.zgc_cdn = cxn.amont_zgc_cdn
        JOIN roseau.trobl trobl ON trobl.aga_cdn = aga.aga_cdn
          AND DATE_PART('year', trobl.trobl_val_deb_dt) <= (SELECT annee FROM params)
          AND (trobl.trobl_val_fin_dt IS NULL OR DATE_PART('year', trobl.trobl_val_fin_dt) >= (SELECT annee FROM params))
        JOIN roseau.tltobl tltobl ON tltobl.tltobl_rfa = trobl.tltobl_rfa
        JOIN roseau.tlref t05 ON t05.tlref_cdn = scl.tlref_05_cdn
        JOIN roseau.bilanscl bil ON bil.scl_cdn = scl.scl_cdn
          AND bil.bilanscl_an = (SELECT annee FROM params)
        JOIN roseau.sclreg sclreg ON sclreg.scl_cdn = scl.scl_cdn
          AND sclreg.sclreg_an = (SELECT annee FROM params)
          AND NOT sclreg.sclreg_suivi_reg_on
        WHERE ${whereClauses.join(' AND ')}
      ),
      filtered_data AS (
        SELECT *
        FROM base_data
        ${impactFilter}
      )
    `;

    const countRows = await this.dataSource.query<{ total: number | string }[]>(
      `${baseQuery}
       SELECT COUNT(*)::int AS total
       FROM filtered_data`,
      queryParams,
    );

    const dataQueryParams = [...queryParams];
    dataQueryParams.push(pageSize);
    const limitPlaceholder = `$${dataQueryParams.length}`;
    dataQueryParams.push((page - 1) * pageSize);
    const offsetPlaceholder = `$${dataQueryParams.length}`;

    const rows = await this.dataSource.query<ConformiteSclRawRow[]>(
      `${baseQuery}
       SELECT
         scl_cdn,
         systeme_collecte_code,
         systeme_collecte_nom,
         tranche_obligation_libelle,
         type_scl,
         suivi_debut_date,
         suivi_fin_date,
         conformite_locale_temps_pluie_provisoire,
         conformite_nationale_temps_pluie_provisoire,
         impact_conformite,
         suivi_regulier_effectue,
         suivi_regulier_date
       FROM filtered_data
       ORDER BY ${sortColumn} ${sortOrder}, systeme_collecte_code ASC
       LIMIT ${limitPlaceholder}
       OFFSET ${offsetPlaceholder}`,
      dataQueryParams,
    );

    return {
      data: rows.map((row) => ({
        sclCdn: Number(row.scl_cdn),
        systemeCollecteCode: row.systeme_collecte_code?.trim() ?? '',
        systemeCollecteNom: row.systeme_collecte_nom?.trim() ?? null,
        trancheObligationLibelle: row.tranche_obligation_libelle?.trim() ?? null,
        typeScl: row.type_scl?.trim() ?? null,
        suiviDebutDate: toISODateOrNull(row.suivi_debut_date),
        suiviFinDate: toISODateOrNull(row.suivi_fin_date),
        conformiteLocaleTempsPluieProvisoire: row.conformite_locale_temps_pluie_provisoire?.trim() ?? null,
        conformiteNationaleTempsPluieProvisoire: row.conformite_nationale_temps_pluie_provisoire?.trim() ?? null,
        impactConformite: row.impact_conformite,
        suiviRegulierEffectue: row.suivi_regulier_effectue,
        suiviRegulierDate: toISODateOrNull(row.suivi_regulier_date),
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async findConformiteSteuDetail(steuCdn: number, annee: number): Promise<ConformiteSteuDetailRow | null> {
    const rows = await this.dataSource.query<ConformiteSteuDetailRawRow[]>(
      `SELECT
        steureg.steureg_conf_loc_per_nb     AS conf_loc_per_nb,
        steureg.steureg_conf_loc_an_nb      AS conf_loc_an_nb,
        steureg.steureg_non_conf_loc_per_nb AS non_conf_loc_per_nb,
        steureg.steureg_non_conf_loc_an_nb  AS non_conf_loc_an_nb,
        steureg.steureg_redh_loc_per_nb     AS redh_loc_per_nb,
        steureg.steureg_redh_loc_an_nb      AS redh_loc_an_nb,
        steureg.steureg_conf_loc_per_lb     AS conf_loc_per_lb,
        steureg.steureg_conf_loc_an_lb      AS conf_loc_an_lb,
        steureg.steureg_non_conf_loc_per_lb AS non_conf_loc_per_lb,
        steureg.steureg_non_conf_loc_an_lb  AS non_conf_loc_an_lb,
        steureg.steureg_redh_loc_per_lb     AS redh_loc_per_lb,
        steureg.steureg_redh_loc_an_lb      AS redh_loc_an_lb,
        steureg.steureg_conf_nat_per_nb     AS conf_nat_per_nb,
        steureg.steureg_conf_nat_an_nb      AS conf_nat_an_nb,
        steureg.steureg_non_conf_nat_per_nb AS non_conf_nat_per_nb,
        steureg.steureg_non_conf_nat_an_nb  AS non_conf_nat_an_nb,
        steureg.steureg_redh_nat_per_nb     AS redh_nat_per_nb,
        steureg.steureg_redh_nat_an_nb      AS redh_nat_an_nb,
        steureg.steureg_conf_nat_per_lb     AS conf_nat_per_lb,
        steureg.steureg_conf_nat_an_lb      AS conf_nat_an_lb,
        steureg.steureg_non_conf_nat_per_lb AS non_conf_nat_per_lb,
        steureg.steureg_non_conf_nat_an_lb  AS non_conf_nat_an_lb,
        steureg.steureg_redh_nat_per_lb     AS redh_nat_per_lb,
        steureg.steureg_redh_nat_an_lb      AS redh_nat_an_lb,
        steureg.steureg_hcnf_per_nb         AS hcnf_per_nb,
        steureg.steureg_hcnf_an_nb          AS hcnf_an_nb,
        steureg.steureg_hcts_per_nb         AS hcts_per_nb,
        steureg.steureg_hcts_an_nb          AS hcts_an_nb,
        steureg.steureg_hcnf_per_lb         AS hcnf_per_lb,
        steureg.steureg_hcnf_an_lb          AS hcnf_an_lb,
        steureg.steureg_hcts_per_lb         AS hcts_per_lb,
        steureg.steureg_hcts_an_lb          AS hcts_an_lb,
        steureg.steureg_evt_per_nb          AS evt_per_nb,
        steureg.steureg_evt_an_nb           AS evt_an_nb
      FROM roseau.steureg steureg
      WHERE steureg.steu_cdn = $1
      AND   steureg.steureg_an = $2;`,
      [steuCdn, annee],
    );

    const row = rows[0];

    if (!row) {
      return null;
    }

    const toNullableNumber = (value: number | string | null) => (value !== null ? Number(value) : null);
    const toNullableString = (value: string | null) => value?.trim() ?? null;

    return {
      conformiteLocaleParametresConformesPeriodeNb: toNullableNumber(row.conf_loc_per_nb),
      conformiteLocaleParametresConformesAnneeNb: toNullableNumber(row.conf_loc_an_nb),
      conformiteLocaleParametresNonConformesPeriodeNb: toNullableNumber(row.non_conf_loc_per_nb),
      conformiteLocaleParametresNonConformesAnneeNb: toNullableNumber(row.non_conf_loc_an_nb),
      conformiteLocaleRedhibitoiresPeriodeNb: toNullableNumber(row.redh_loc_per_nb),
      conformiteLocaleRedhibitoiresAnneeNb: toNullableNumber(row.redh_loc_an_nb),
      conformiteLocaleParametresConformesPeriodeLb: toNullableString(row.conf_loc_per_lb),
      conformiteLocaleParametresConformesAnneeLb: toNullableString(row.conf_loc_an_lb),
      conformiteLocaleParametresNonConformesPeriodeLb: toNullableString(row.non_conf_loc_per_lb),
      conformiteLocaleParametresNonConformesAnneeLb: toNullableString(row.non_conf_loc_an_lb),
      conformiteLocaleRedhibitoiresPeriodeLb: toNullableString(row.redh_loc_per_lb),
      conformiteLocaleRedhibitoiresAnneeLb: toNullableString(row.redh_loc_an_lb),
      conformiteNationaleParametresConformesPeriodeNb: toNullableNumber(row.conf_nat_per_nb),
      conformiteNationaleParametresConformesAnneeNb: toNullableNumber(row.conf_nat_an_nb),
      conformiteNationaleParametresNonConformesPeriodeNb: toNullableNumber(row.non_conf_nat_per_nb),
      conformiteNationaleParametresNonConformesAnneeNb: toNullableNumber(row.non_conf_nat_an_nb),
      conformiteNationaleRedhibitoiresPeriodeNb: toNullableNumber(row.redh_nat_per_nb),
      conformiteNationaleRedhibitoiresAnneeNb: toNullableNumber(row.redh_nat_an_nb),
      conformiteNationaleParametresConformesPeriodeLb: toNullableString(row.conf_nat_per_lb),
      conformiteNationaleParametresConformesAnneeLb: toNullableString(row.conf_nat_an_lb),
      conformiteNationaleParametresNonConformesPeriodeLb: toNullableString(row.non_conf_nat_per_lb),
      conformiteNationaleParametresNonConformesAnneeLb: toNullableString(row.non_conf_nat_an_lb),
      conformiteNationaleRedhibitoiresPeriodeLb: toNullableString(row.redh_nat_per_lb),
      conformiteNationaleRedhibitoiresAnneeLb: toNullableString(row.redh_nat_an_lb),
      hcnfPeriodeNb: toNullableNumber(row.hcnf_per_nb),
      hcnfAnneeNb: toNullableNumber(row.hcnf_an_nb),
      hctsPeriodeNb: toNullableNumber(row.hcts_per_nb),
      hctsAnneeNb: toNullableNumber(row.hcts_an_nb),
      hcnfPeriodeLb: toNullableString(row.hcnf_per_lb),
      hcnfAnneeLb: toNullableString(row.hcnf_an_lb),
      hctsPeriodeLb: toNullableString(row.hcts_per_lb),
      hctsAnneeLb: toNullableString(row.hcts_an_lb),
      evenementsPeriodeNb: toNullableNumber(row.evt_per_nb),
      evenementsAnneeNb: toNullableNumber(row.evt_an_nb),
    };
  }

  async findConformiteSclDetail(sclCdn: number, annee: number): Promise<ConformiteSclDetailRow | null> {
    const rows = await this.dataSource.query<ConformiteSclDetailRawRow[]>(
      `SELECT
        sclreg.sclreg_per_vol_dev_pc       AS volume_deverse_periode_pc,
        sclreg.sclreg_an_vol_dev_pc        AS volume_deverse_annee_pc,
        sclreg.sclreg_per_conf_vol_dev_in  AS conformite_volume_periode,
        sclreg.sclreg_an_conf_vol_dev_in   AS conformite_volume_annee,
        sclreg.sclreg_per_flux_dev_pc      AS flux_deverse_periode_pc,
        sclreg.sclreg_an_flux_dev_pc       AS flux_deverse_annee_pc,
        sclreg.sclreg_per_conf_flux_dev_in AS conformite_flux_periode,
        sclreg.sclreg_an_conf_flux_dev_in  AS conformite_flux_annee,
        sclreg.sclreg_per_jour_dev_nb      AS jours_deversement_periode_nb,
        sclreg.sclreg_an_jour_dev_nb       AS jours_deversement_annee_nb,
        sclreg.sclreg_per_conf_jour_dev_in AS conformite_jours_deversement_periode,
        sclreg.sclreg_an_conf_jour_dev_in  AS conformite_jours_deversement_annee
      FROM roseau.sclreg
      WHERE sclreg.scl_cdn = $1
      AND sclreg.sclreg_an = $2;`,
      [sclCdn, annee],
    );

    const row = rows[0];

    if (!row) {
      return null;
    }

    const toNullableNumber = (value: number | string | null) => (value !== null ? Number(value) : null);
    const toNullableString = (value: string | null) => value?.trim() ?? null;

    return {
      volumeDeversePeriodePc: toNullableNumber(row.volume_deverse_periode_pc),
      volumeDeverseAnneePc: toNullableNumber(row.volume_deverse_annee_pc),
      conformiteVolumePeriode: toNullableString(row.conformite_volume_periode),
      conformiteVolumeAnnee: toNullableString(row.conformite_volume_annee),
      fluxDeversePeriodePc: toNullableNumber(row.flux_deverse_periode_pc),
      fluxDeverseAnneePc: toNullableNumber(row.flux_deverse_annee_pc),
      conformiteFluxPeriode: toNullableString(row.conformite_flux_periode),
      conformiteFluxAnnee: toNullableString(row.conformite_flux_annee),
      joursDeversementPeriodeNb: toNullableNumber(row.jours_deversement_periode_nb),
      joursDeversementAnneeNb: toNullableNumber(row.jours_deversement_annee_nb),
      conformiteJoursDeversementPeriode: toNullableString(row.conformite_jours_deversement_periode),
      conformiteJoursDeversementAnnee: toNullableString(row.conformite_jours_deversement_annee),
    };
  }

  async findMesures(filters: MesureFilters): Promise<{ data: MesureRow[]; total: number }> {
    const {
      ouvrageType,
      ouvrageDepollutionCodes,
      systemeCollecteCodes,
      pointMesureId,
      dateDebut,
      dateFin,
      parametreAnalyseCode,
      resultatAnalyseQualification,
      resultatAnalyseStatut,
      analyseFinalite,
      page,
      pageSize,
    } = filters;
    const sortBy = filters.sortBy ?? 'default';
    const sortOrder = filters.sortOrder ?? 'ASC';

    const buildBaseQuery = () => {
      if (ouvrageType === 'scl') {
        // Mode SCL : pmo -> scl -> steu (chemin via le système de collecte)
        return this.alrRepository
          .createQueryBuilder('alr')
          .innerJoin(PleEntity, 'ple', 'ple.ple_cdn = alr.ple_cdn')
          .innerJoin(PmoEntity, 'pmo', 'pmo.pmo_cdn = ple.pmo_cdn')
          .innerJoin(SclEntity, 'scl', 'scl.scl_cdn = pmo.scl_cdn')
          .innerJoin(SteuEntity, 'steu', 'steu.steu_cdn = scl.steu_cdn')
          .innerJoin(TlrefEntity, 't16', 't16.tlref_cdn = pmo.tlref_16_cdn')
          .leftJoin(TlrefEntity, 't20', 't20.tlref_cdn = alr.tlref_20_cdn')
          .leftJoin(TlrefEntity, 't18', 't18.tlref_cdn = alr.tlref_18_cdn')
          .leftJoin(TlrefEntity, 't17', 't17.tlref_cdn = alr.tlref_17_cdn')
          .innerJoin(ParEntity, 'par', 'par.par_rfa = alr.par_rfa')
          .leftJoin(UrfEntity, 'urf', 'urf.urf_rfa = alr.urf_rfa');
      } else {
        // Mode STEU : pmo -> steu (jointure directe)
        return this.alrRepository
          .createQueryBuilder('alr')
          .innerJoin(PleEntity, 'ple', 'ple.ple_cdn = alr.ple_cdn')
          .innerJoin(PmoEntity, 'pmo', 'pmo.pmo_cdn = ple.pmo_cdn')
          .innerJoin(SteuEntity, 'steu', 'steu.steu_cdn = pmo.steu_cdn')
          .innerJoin(TlrefEntity, 't16', 't16.tlref_cdn = pmo.tlref_16_cdn')
          .leftJoin(TlrefEntity, 't20', 't20.tlref_cdn = alr.tlref_20_cdn')
          .leftJoin(TlrefEntity, 't18', 't18.tlref_cdn = alr.tlref_18_cdn')
          .leftJoin(TlrefEntity, 't17', 't17.tlref_cdn = alr.tlref_17_cdn')
          .innerJoin(ParEntity, 'par', 'par.par_rfa = alr.par_rfa')
          .leftJoin(UrfEntity, 'urf', 'urf.urf_rfa = alr.urf_rfa');
      }
    };

    const applyFilters = (qb: ReturnType<typeof buildBaseQuery>) => {
      if (ouvrageType === 'scl') {
        if (systemeCollecteCodes.length > 0) {
          qb.andWhere('scl.scl_sandre_cda IN (:...systemeCollecteCodes)', { systemeCollecteCodes });
        }
      } else {
        if (ouvrageDepollutionCodes.length > 0) {
          qb.andWhere('steu.steu_sandre_cda IN (:...ouvrageDepollutionCodes)', { ouvrageDepollutionCodes });
        }
      }
      if (pointMesureId !== undefined) {
        qb.andWhere('pmo.pmo_cdn = :pointMesureId', { pointMesureId });
      }
      if (dateDebut) {
        qb.andWhere('ple.ple_prelev_dt >= :dateDebut', { dateDebut });
      }
      if (dateFin) {
        qb.andWhere('ple.ple_prelev_dt <= :dateFin', { dateFin });
      }
      if (parametreAnalyseCode) {
        qb.andWhere('par.par_rfa = :parametreAnalyseCode', { parametreAnalyseCode });
      }
      if (resultatAnalyseQualification) {
        qb.andWhere('t18.tlref_elt_cda = :resultatAnalyseQualification', { resultatAnalyseQualification });
      }
      if (resultatAnalyseStatut) {
        qb.andWhere('t20.tlref_elt_cda = :resultatAnalyseStatut', { resultatAnalyseStatut });
      }
      if (analyseFinalite) {
        qb.andWhere('t17.tlref_elt_cda = :analyseFinalite', { analyseFinalite });
      }
      return qb;
    };

    const countQb = applyFilters(buildBaseQuery());
    const total = await countQb.getCount();

    const dataQb = applyFilters(buildBaseQuery())
      .select('steu.steu_sandre_cda', 'steu_sandre_cda')
      .addSelect('steu.steu_nom_lb', 'steu_nom')
      .addSelect(ouvrageType === 'scl' ? 'scl.scl_sandre_cda' : 'NULL::text', 'scl_sandre_cda')
      .addSelect(ouvrageType === 'scl' ? 'scl.scl_lb' : 'NULL::text', 'scl_nom')
      .addSelect('t16.tlref_elt_cda', 'localisation_point')
      .addSelect('pmo.pmo_ae_cda', 'num_point_agence')
      .addSelect('pmo.pmo_no', 'num_point')
      .addSelect('pmo.pmo_lb', 'nom_point')
      .addSelect('ple.ple_prelev_dt', 'date')
      .addSelect('par.par_rfa', 'parametre_code')
      .addSelect('par.par_court_nom_lb', 'parametre_nom')
      .addSelect('alr.alr_res_val', 'valeur')
      .addSelect('urf.urf_symb_lb', 'unite')
      .addSelect('t17.tlref_mnemo_lb', 'finalite')
      .addSelect(
        "CASE WHEN t20.tlref_elt_cda IS NOT NULL THEN t20.tlref_elt_cda || '-' || COALESCE(t20.tlref_mnemo_lb, '') ELSE NULL END",
        'statut',
      )
      .addSelect('t18.tlref_mnemo_lb', 'qualification');

    const sortMap: Record<string, string> = {
      date: 'ple.ple_prelev_dt',
      parametreCode: 'par.par_rfa',
      valeur: 'alr.alr_res_val',
      statut: 'statut',
    };

    if (sortBy === 'default') {
      if (ouvrageType === 'scl') {
        dataQb
          .orderBy('scl.scl_lb', sortOrder)
          .addOrderBy('t16.tlref_elt_cda', sortOrder)
          .addOrderBy('pmo.pmo_no', sortOrder)
          .addOrderBy('ple.ple_prelev_dt', sortOrder)
          .addOrderBy('par.par_rfa', sortOrder);
      } else {
        dataQb
          .orderBy('steu.steu_nom_lb', sortOrder)
          .addOrderBy('t16.tlref_elt_cda', sortOrder)
          .addOrderBy('pmo.pmo_no', sortOrder)
          .addOrderBy('ple.ple_prelev_dt', sortOrder)
          .addOrderBy('par.par_rfa', sortOrder);
      }
    } else {
      const sortColumn = sortMap[sortBy];
      if (!sortColumn) {
        throw new Error(`Invalid sortBy value: "${sortBy}"`);
      }
      dataQb.orderBy(sortColumn, sortOrder);
    }

    dataQb.offset((page - 1) * pageSize).limit(pageSize);

    const rows = await dataQb.getRawMany<{
      steu_sandre_cda: string;
      steu_nom: string | null;
      scl_sandre_cda: string | null;
      scl_nom: string | null;
      localisation_point: string | null;
      num_point_agence: string | null;
      num_point: string | null;
      nom_point: string | null;
      date: Date | null;
      parametre_code: string;
      parametre_nom: string | null;
      valeur: string | null;
      unite: string | null;
      finalite: string | null;
      statut: string | null;
      qualification: string | null;
    }>();

    const data: MesureRow[] = rows.map((r) => ({
      ouvrageDepollutionCode: r.steu_sandre_cda?.trim() ?? '',
      ouvrageDepollutionNom: r.steu_nom?.trim() ?? null,
      systemeCollecteCode: r.scl_sandre_cda?.trim() ?? null,
      systemeCollecteNom: r.scl_nom?.trim() ?? null,
      pointMesureLocalisationCode: r.localisation_point?.trim() ?? null,
      pointAgenceEauNumero: r.num_point_agence?.trim() ?? null,
      pointMesureNumero: r.num_point?.trim() ?? null,
      pointMesureLibelle: r.nom_point?.trim() ?? null,
      prelevementDate: r.date ? new Date(r.date) : null,
      parametreAnalyseCode: r.parametre_code?.trim() ?? '',
      parametreNomCourt: r.parametre_nom?.trim() ?? null,
      resultatAnalyseValeur: r.valeur !== null && r.valeur !== undefined ? parseFloat(r.valeur) : null,
      uniteMesureSymbole: r.unite?.trim() ?? null,
      analyseFinalite: r.finalite?.trim() ?? null,
      resultatAnalyseStatut: r.statut?.trim() ?? null,
      resultatAnalyseQualification: r.qualification?.trim() ?? null,
    }));

    return { data, total };
  }

  async findSteuWithNamesBySandreCdas(sandreCdas: string[]): Promise<SteuWithName[]> {
    if (sandreCdas.length === 0) return [];
    const rows = await this.steuRepository
      .createQueryBuilder('s')
      .where('s.steu_sandre_cda IN (:...sandreCdas)', { sandreCdas })
      .getMany();
    return rows.map((s) => ({
      ouvrageDepollutionCode: s.steuSandreCda?.trim() ?? '',
      ouvrageDepollutionNom: s.steuNomLb?.trim() ?? null,
    }));
  }

  async findSclWithNamesBySandreCdas(sandreCdas: string[]): Promise<SclWithName[]> {
    if (sandreCdas.length === 0) return [];
    const rows = await this.sclRepository
      .createQueryBuilder('scl')
      .where('scl.scl_sandre_cda IN (:...sandreCdas)', { sandreCdas })
      .getMany();
    return rows.map((s) => ({
      systemeCollecteCode: s.sclSandreCda?.trim() ?? '',
      systemeCollecteNom: s.sclLb?.trim() ?? null,
    }));
  }

  async findPointsMesureByOuvrage(ouvrageType: 'steu' | 'scl', ouvrageCode: string): Promise<PointMesure[]> {
    const qb = this.pmoRepository
      .createQueryBuilder('pmo')
      .select('pmo.pmo_cdn', 'pmo_cdn')
      .addSelect('pmo.pmo_no', 'pmo_no')
      .addSelect('pmo.pmo_lb', 'pmo_lb');

    if (ouvrageType === 'scl') {
      // Mode SCL : pmo -> scl (jointure directe via scl_cdn)
      qb.innerJoin(SclEntity, 'scl', 'scl.scl_cdn = pmo.scl_cdn').where('scl.scl_sandre_cda = :ouvrageCode', {
        ouvrageCode,
      });
    } else {
      // Mode STEU : pmo -> steu (jointure directe via steu_cdn)
      qb.innerJoin(SteuEntity, 'steu', 'steu.steu_cdn = pmo.steu_cdn').where('steu.steu_sandre_cda = :ouvrageCode', {
        ouvrageCode,
      });
    }

    qb.orderBy('pmo.pmo_no', 'ASC');

    const rows = await qb.getRawMany<{ pmo_cdn: number; pmo_no: string; pmo_lb: string | null }>();
    return rows.map((r) => ({
      pointMesureId: r.pmo_cdn,
      pointMesureNumero: r.pmo_no?.trim() ?? '',
      pointMesureLibelle: r.pmo_lb?.trim() ?? null,
    }));
  }

  async findParametresByOuvrageAndPmo(
    ouvrageType: 'steu' | 'scl',
    ouvrageCode: string,
    pmoCdn: number,
  ): Promise<ParametreMesure[]> {
    const qb = this.alrRepository
      .createQueryBuilder('alr')
      .select('alr.par_rfa', 'par_rfa')
      .addSelect('par.par_court_nom_lb', 'par_court_nom_lb')
      .innerJoin(PleEntity, 'ple', 'ple.ple_cdn = alr.ple_cdn')
      .innerJoin(PmoEntity, 'pmo', 'pmo.pmo_cdn = ple.pmo_cdn')
      .innerJoin(ParEntity, 'par', 'par.par_rfa = alr.par_rfa')
      .andWhere('pmo.pmo_cdn = :pmoCdn', { pmoCdn });

    if (ouvrageType === 'scl') {
      qb.innerJoin(SclEntity, 'scl', 'scl.scl_cdn = pmo.scl_cdn').where('scl.scl_sandre_cda = :ouvrageCode', {
        ouvrageCode,
      });
    } else {
      qb.innerJoin(SteuEntity, 'steu', 'steu.steu_cdn = pmo.steu_cdn').where('steu.steu_sandre_cda = :ouvrageCode', {
        ouvrageCode,
      });
    }

    qb.distinct(true).orderBy('alr.par_rfa', 'ASC');

    const rows = await qb.getRawMany<{ par_rfa: string; par_court_nom_lb: string | null }>();
    return rows.map((r) => ({
      parametreAnalyseCode: r.par_rfa?.trim() ?? '',
      parametreNomCourt: r.par_court_nom_lb?.trim() ?? null,
    }));
  }

  async findEvenementSteu(filters: EvenementSteuFilters): Promise<{ data: EvenementSteuRow[]; total: number }> {
    const { ouvrageDepollutionIds, year, page, pageSize } = filters;

    if (ouvrageDepollutionIds.length === 0) {
      return { data: [], total: 0 };
    }

    const sortBy = filters.sortBy ?? 'date';
    const sortOrder = filters.sortOrder ?? 'ASC';

    const sortMap: Record<NonNullable<EvenementSteuFilters['sortBy']>, string> = {
      date: 'date',
      typeEvenementCode: 'type_evenement_code',
      prisEnCompte: 'pris_en_compte',
      finalite: 'finalite',
    };

    const sortColumn = sortMap[sortBy];
    if (!sortColumn) {
      throw new Error(`Invalid sortBy value: "${sortBy}"`);
    }

    const queryParams: Array<number | string | boolean> = [];
    const addParam = (value: number | string | boolean) => {
      queryParams.push(value);
      return `$${queryParams.length}`;
    };

    const yearPlaceholder = addParam(year);
    const steuPlaceholders = ouvrageDepollutionIds.map((cdn) => addParam(cdn)).join(', ');
    const whereClauses = [
      `steu.steu_cdn IN (${steuPlaceholders})`,
      `date_part('year', evo.evo_evt_dt) = ${yearPlaceholder}`,
      `t46.tlref_elt_cda IN ('1','2','3','4')`,
    ];

    if (filters.typeEvenementCode) {
      whereClauses.push(`t46.tlref_elt_cda = ${addParam(filters.typeEvenementCode)}`);
    }

    const baseQuery = `
      WITH base_data AS (
        SELECT
          evo.evo_inactif_on AS pris_en_compte,
          evo.evo_evt_dt AS date,
          steu.steu_sandre_cda AS ouvrage_depollution_code,
          steu.steu_nom_lb AS ouvrage_depollution_nom,
          t46.tlref_elt_cda AS type_evenement_code,
          t46.tlref_mnemo_lb AS type_evenement_libelle,
          t17.tlref_mnemo_lb AS finalite,
          evo.evo_desc_txt AS commentaire
        FROM roseau.evo evo
        JOIN roseau.steu steu ON steu.steu_cdn = evo.steu_cdn
        JOIN roseau.tlref t46 ON t46.tlref_cdn = evo.tlref_46_cdn
        LEFT JOIN roseau.tlref t17 ON t17.tlref_cdn = evo.tlref_17_cdn
        WHERE ${whereClauses.join(' AND ')}
      )
    `;

    const countRows = await this.dataSource.query<{ total: number | string }[]>(
      `${baseQuery} SELECT COUNT(*)::int AS total FROM base_data`,
      queryParams,
    );

    const dataQueryParams = [...queryParams];
    dataQueryParams.push(pageSize);
    const limitPlaceholder = `$${dataQueryParams.length}`;
    dataQueryParams.push((page - 1) * pageSize);
    const offsetPlaceholder = `$${dataQueryParams.length}`;

    const rows = await this.dataSource.query<
      {
        pris_en_compte: boolean;
        date: Date | string;
        ouvrage_depollution_code: string;
        ouvrage_depollution_nom: string | null;
        type_evenement_code: string;
        type_evenement_libelle: string;
        finalite: string | null;
        commentaire: string | null;
      }[]
    >(
      `${baseQuery}
       SELECT * FROM base_data
       ORDER BY ${sortColumn} ${sortOrder}, date ASC
       LIMIT ${limitPlaceholder}
       OFFSET ${offsetPlaceholder}`,
      dataQueryParams,
    );

    return {
      data: rows.map((row) => ({
        prisEnCompte: row.pris_en_compte,
        date: toISODateOrNull(row.date) ?? '',
        ouvrageDepollutionCode: row.ouvrage_depollution_code?.trim() ?? '',
        ouvrageDepollutionNom: row.ouvrage_depollution_nom?.trim() ?? null,
        typeEvenementCode: row.type_evenement_code?.trim() ?? '',
        typeEvenementLibelle: row.type_evenement_libelle?.trim() ?? '',
        finalite: row.finalite?.trim() ?? null,
        commentaire: row.commentaire?.trim() ?? null,
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async findEvenementScl(filters: EvenementSclFilters): Promise<{ data: EvenementSclRow[]; total: number }> {
    const { systemeCollecteIds, year, page, pageSize } = filters;

    if (systemeCollecteIds.length === 0) {
      return { data: [], total: 0 };
    }

    const sortBy = filters.sortBy ?? 'date';
    const sortOrder = filters.sortOrder ?? 'ASC';

    const sortMap: Record<NonNullable<EvenementSclFilters['sortBy']>, string> = {
      date: 'date',
      typeEvenementCode: 'type_evenement_code',
      prisEnCompte: 'pris_en_compte',
      finalite: 'finalite',
      pointMesureNumero: 'point_mesure_numero',
    };

    const sortColumn = sortMap[sortBy];
    if (!sortColumn) {
      throw new Error(`Invalid sortBy value: "${sortBy}"`);
    }

    const queryParams: Array<number | string | boolean> = [];
    const addParam = (value: number | string | boolean) => {
      queryParams.push(value);
      return `$${queryParams.length}`;
    };

    const yearPlaceholder = addParam(year);
    const sclPlaceholders = systemeCollecteIds.map((cdn) => addParam(cdn)).join(', ');
    const whereClauses = [
      `scl.scl_cdn IN (${sclPlaceholders})`,
      `date_part('year', evo.evo_evt_dt) = ${yearPlaceholder}`,
      `t46.tlref_elt_cda IN ('1','2','3','4')`,
    ];

    if (filters.typeEvenementCode) {
      whereClauses.push(`t46.tlref_elt_cda = ${addParam(filters.typeEvenementCode)}`);
    }

    if (filters.pointMesureId) {
      whereClauses.push(`pmo.pmo_cdn = ${addParam(filters.pointMesureId)}`);
    }

    const baseQuery = `
      WITH base_data AS (
        SELECT
          evo.evo_inactif_on AS pris_en_compte,
          evo.evo_evt_dt AS date,
          steu.steu_sandre_cda AS ouvrage_depollution_code,
          steu.steu_nom_lb AS ouvrage_depollution_nom,
          scl.scl_sandre_cda AS systeme_collecte_code,
          scl.scl_lb AS systeme_collecte_nom,
          t46.tlref_elt_cda AS type_evenement_code,
          t46.tlref_mnemo_lb AS type_evenement_libelle,
          t17.tlref_mnemo_lb AS finalite,
          evo.evo_desc_txt AS commentaire,
          pmo.pmo_no AS point_mesure_numero,
          pmo.pmo_lb AS point_mesure_libelle
        FROM roseau.evo evo
        JOIN roseau.pmo pmo ON pmo.pmo_cdn = evo.pmo_cdn
        JOIN roseau.scl scl ON scl.scl_cdn = pmo.scl_cdn
        JOIN roseau.steu steu ON steu.steu_cdn = scl.steu_cdn
        JOIN roseau.tlref t46 ON t46.tlref_cdn = evo.tlref_46_cdn
        LEFT JOIN roseau.tlref t17 ON t17.tlref_cdn = evo.tlref_17_cdn
        WHERE ${whereClauses.join(' AND ')}
      )
    `;

    const countRows = await this.dataSource.query<{ total: number | string }[]>(
      `${baseQuery} SELECT COUNT(*)::int AS total FROM base_data`,
      queryParams,
    );

    const dataQueryParams = [...queryParams];
    dataQueryParams.push(pageSize);
    const limitPlaceholder = `$${dataQueryParams.length}`;
    dataQueryParams.push((page - 1) * pageSize);
    const offsetPlaceholder = `$${dataQueryParams.length}`;

    const rows = await this.dataSource.query<
      {
        pris_en_compte: boolean;
        date: Date | string;
        ouvrage_depollution_code: string;
        ouvrage_depollution_nom: string | null;
        systeme_collecte_code: string;
        systeme_collecte_nom: string | null;
        type_evenement_code: string;
        type_evenement_libelle: string;
        finalite: string | null;
        commentaire: string | null;
        point_mesure_numero: string;
        point_mesure_libelle: string | null;
      }[]
    >(
      `${baseQuery}
       SELECT * FROM base_data
       ORDER BY ${sortColumn} ${sortOrder}, date ASC
       LIMIT ${limitPlaceholder}
       OFFSET ${offsetPlaceholder}`,
      dataQueryParams,
    );

    return {
      data: rows.map((row) => ({
        prisEnCompte: row.pris_en_compte,
        date: toISODateOrNull(row.date) ?? '',
        ouvrageDepollutionCode: row.ouvrage_depollution_code?.trim() ?? '',
        ouvrageDepollutionNom: row.ouvrage_depollution_nom?.trim() ?? null,
        systemeCollecteCode: row.systeme_collecte_code?.trim() ?? '',
        systemeCollecteNom: row.systeme_collecte_nom?.trim() ?? null,
        typeEvenementCode: row.type_evenement_code?.trim() ?? '',
        typeEvenementLibelle: row.type_evenement_libelle?.trim() ?? '',
        finalite: row.finalite?.trim() ?? null,
        commentaire: row.commentaire?.trim() ?? null,
        pointMesureNumero: row.point_mesure_numero?.trim() ?? '',
        pointMesureLibelle: row.point_mesure_libelle?.trim() ?? null,
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async findBilanSteu(filters: BilanSteuFilters): Promise<{ data: BilanSteuRow[]; total: number }> {
    const { ouvrageDepollutionIds, year, page, pageSize, ouvrageDepollutionCode } = filters;

    if (ouvrageDepollutionIds.length === 0) {
      return { data: [], total: 0 };
    }

    const sortBy = filters.sortBy ?? 'date';
    const sortOrder = filters.sortOrder ?? 'ASC';

    const sortMap: Record<NonNullable<BilanSteuFilters['sortBy']>, string> = {
      date: 'date',
      ouvrageDepollutionCode: 'ouvrage_depollution_code',
      ouvrageDepollutionNom: 'ouvrage_depollution_nom',
      parametreNom: 'parametre_nom',
    };

    const sortColumn = sortMap[sortBy];
    if (!sortColumn) {
      throw new Error(`Invalid sortBy value: "${sortBy}"`);
    }

    const queryParams: Array<number | string | boolean> = [];
    const addParam = (value: number | string | boolean) => {
      queryParams.push(value);
      return `$${queryParams.length}`;
    };

    const startDate = addParam(`${year}-01-01`);
    const endDate = addParam(`${year}-12-31`);
    const steuPlaceholders = ouvrageDepollutionIds.map((cdn) => addParam(cdn)).join(', ');
    const whereClauses = [
      `steu.steu_cdn IN (${steuPlaceholders})`,
      `resj.resj_mes_dt >= ${startDate}`,
      `resj.resj_mes_dt <= ${endDate}`,
      `(resj.resj_jok_in = '2' OR resj.resj_aok_in = '2')`,
    ];

    if (ouvrageDepollutionCode) {
      whereClauses.push(`steu.steu_sandre_cda = ${addParam(ouvrageDepollutionCode)}`);
    }

    const baseQuery = `
      WITH base_data AS (
        SELECT
          steu.steu_cdn AS steu_cdn,
          RTRIM(steu.steu_sandre_cda) AS ouvrage_depollution_code,
          steu.steu_nom_lb AS ouvrage_depollution_nom,
          resj.resj_mes_dt::date AS date,
          par.par_court_nom_lb AS parametre_nom,
          CASE resj.resj_aok_in
            WHEN '1' THEN 'PRIS EN COMPTE'
            WHEN '2' THEN 'NON PRIS EN COMPTE'
            ELSE 'SANS OBJET'
          END AS bilan_spe_a,
          CASE resj.resj_evt_in
            WHEN 'O' THEN 'Oui'
            ELSE 'Non'
          END AS evt,
          CASE resj.resj_hcnf_in
            WHEN 'O' THEN 'Non'
            ELSE 'Oui'
          END AS hcnf,
          t17.tlref_mnemo_lb AS finalite,
          resj.resj_jok_in AS prise_en_compte_j_code,
          resj.resj_aok_in AS prise_en_compte_a_code
        FROM roseau.resj resj
        JOIN roseau.steu steu ON steu.steu_cdn = resj.steu_cdn
        JOIN lanceleau.par par ON par.par_rfa = resj.par_rfa
        LEFT JOIN roseau.tlref t17 ON t17.tlref_cdn = resj.tlref_17_cdn
        WHERE ${whereClauses.join(' AND ')}
      )
    `;

    const countRows = await this.dataSource.query<{ total: number | string }[]>(
      `${baseQuery} SELECT COUNT(*)::int AS total FROM base_data`,
      queryParams,
    );

    const dataQueryParams = [...queryParams];
    dataQueryParams.push(pageSize);
    const limitPlaceholder = `$${dataQueryParams.length}`;
    dataQueryParams.push((page - 1) * pageSize);
    const offsetPlaceholder = `$${dataQueryParams.length}`;

    const rows = await this.dataSource.query<
      {
        steu_cdn: number;
        ouvrage_depollution_code: string;
        ouvrage_depollution_nom: string | null;
        date: Date | string;
        parametre_nom: string | null;
        bilan_spe_a: string;
        evt: 'Oui' | 'Non';
        hcnf: 'Oui' | 'Non';
        finalite: string | null;
      }[]
    >(
      `${baseQuery}
       SELECT
          steu_cdn,
          ouvrage_depollution_code,
          ouvrage_depollution_nom,
          bilan_spe_a,
          date,
          parametre_nom,
          hcnf,
          evt,
          finalite
       FROM base_data
       ORDER BY ${sortColumn} ${sortOrder}, date ASC
       LIMIT ${limitPlaceholder}
       OFFSET ${offsetPlaceholder}`,
      dataQueryParams,
    );

    return {
      data: rows.map((row) => ({
        steuCdn: row.steu_cdn,
        ouvrageDepollutionCode: row.ouvrage_depollution_code?.trim() ?? '',
        ouvrageDepollutionNom: row.ouvrage_depollution_nom?.trim() ?? null,
        bilanEcarteParSpe: row.bilan_spe_a === 'NON PRIS EN COMPTE',
        date: toISODateOrNull(row.date) ?? '',
        parametreNom: row.parametre_nom?.trim() ?? null,
        hcnf: row.hcnf,
        evt: row.evt,
        finalite: row.finalite?.trim() ?? null,
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async findBilanScl(filters: BilanSclFilters): Promise<{ data: BilanSclRow[]; total: number }> {
    const { systemeCollecteIds, year, page, pageSize, systemeCollecteCode, pointMesureId, statut } = filters;

    if (systemeCollecteIds.length === 0) {
      return { data: [], total: 0 };
    }

    const sortBy = filters.sortBy ?? 'date';
    const sortOrder = filters.sortOrder ?? 'ASC';

    const sortMap: Record<NonNullable<BilanSclFilters['sortBy']>, string> = {
      date: 'date',
      systemeCollecteCode: 'systeme_collecte_code',
      pointMesureNumero: 'point_mesure_numero',
      statut: 'statut',
    };

    const sortColumn = sortMap[sortBy];
    if (!sortColumn) {
      throw new Error(`Invalid sortBy value: "${sortBy}"`);
    }

    const queryParams: Array<number | string | boolean> = [];
    const addParam = (value: number | string | boolean) => {
      queryParams.push(value);
      return `$${queryParams.length}`;
    };

    const yearPlaceholder = addParam(year);
    const sclPlaceholders = systemeCollecteIds.map((cdn) => addParam(cdn)).join(', ');
    const whereClauses = [
      `scl.scl_cdn IN (${sclPlaceholders})`,
      `date_part('year', d.devers_dt) = ${yearPlaceholder}`,
      `d.devers_pris_en_compte_on = false`,
      `(d.devers_statut_in IN ('TP', 'TS') OR d.devers_statut_s_in IN ('TP', 'TS'))`,
    ];

    if (systemeCollecteCode) {
      whereClauses.push(`scl.scl_sandre_cda = ${addParam(systemeCollecteCode)}`);
    }
    if (pointMesureId) {
      whereClauses.push(`pmo.pmo_cdn = ${addParam(pointMesureId)}`);
    }
    if (statut) {
      whereClauses.push(`
        (CASE
          WHEN d.devers_statut_in <> d.devers_statut_s_in THEN d.devers_statut_s_in
          ELSE d.devers_statut_in
        END) = ${addParam(statut)}
      `);
    }

    const baseQuery = `
      WITH base_data AS (
        SELECT
          scl.scl_cdn AS scl_cdn,
          RTRIM(scl.scl_sandre_cda) AS systeme_collecte_code,
          scl.scl_lb AS systeme_collecte_nom,
          pmo.pmo_cdn AS point_mesure_identifiant,
          pmo.pmo_no AS point_mesure_numero,
          pmo.pmo_lb AS point_mesure_libelle,
          d.devers_dt::date AS date,
          d.devers_vol_val AS volume_deverse,
          d.devers_temps_devers_val AS temps_deversement,
          CASE
            WHEN d.devers_statut_in <> d.devers_statut_s_in THEN d.devers_statut_s_in
            ELSE d.devers_statut_in
          END AS statut
        FROM roseau.devers d
        JOIN roseau.pmo pmo ON pmo.pmo_cdn = d.pmo_cdn
        JOIN roseau.scl scl ON scl.scl_cdn = pmo.scl_cdn
        WHERE ${whereClauses.join(' AND ')}
      )
    `;

    const countRows = await this.dataSource.query<{ total: number | string }[]>(
      `${baseQuery} SELECT COUNT(*)::int AS total FROM base_data`,
      queryParams,
    );

    const dataQueryParams = [...queryParams];
    dataQueryParams.push(pageSize);
    const limitPlaceholder = `$${dataQueryParams.length}`;
    dataQueryParams.push((page - 1) * pageSize);
    const offsetPlaceholder = `$${dataQueryParams.length}`;

    const rows = await this.dataSource.query<
      {
        scl_cdn: number;
        systeme_collecte_code: string;
        systeme_collecte_nom: string | null;
        point_mesure_identifiant: number;
        point_mesure_numero: string;
        point_mesure_libelle: string | null;
        date: Date | string;
        volume_deverse: number | null;
        temps_deversement: number | null;
        statut: 'TP' | 'TS';
      }[]
    >(
      `${baseQuery}
       SELECT
        scl_cdn,
        systeme_collecte_code,
        systeme_collecte_nom,
        point_mesure_identifiant,
        point_mesure_numero,
        point_mesure_libelle,
        date,
        volume_deverse,
        temps_deversement,
        statut
       FROM base_data
       ORDER BY ${sortColumn} ${sortOrder}, date ASC
       LIMIT ${limitPlaceholder}
       OFFSET ${offsetPlaceholder}`,
      dataQueryParams,
    );

    return {
      data: rows.map((row) => ({
        sclCdn: row.scl_cdn,
        systemeCollecteCode: row.systeme_collecte_code?.trim() ?? '',
        systemeCollecteNom: row.systeme_collecte_nom?.trim() ?? null,
        pointMesureId: row.point_mesure_identifiant,
        pointMesureNumero: row.point_mesure_numero?.trim() ?? '',
        pointMesureLibelle: row.point_mesure_libelle?.trim() ?? null,
        date: toISODateOrNull(row.date) ?? '',
        volumeDeverse: row.volume_deverse != null ? Number(row.volume_deverse) : null,
        tempsDeversement: row.temps_deversement != null ? Number(row.temps_deversement) : null,
        statut: row.statut,
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async findTransmissionASRetardSteu(
    filters: TransmissionASRetardSteuFilters,
  ): Promise<{ data: TransmissionASRetardSteuRow[]; total: number }> {
    const { ouvrageDepollutionIds, year, page, pageSize, ouvrageDepollutionCode } = filters;

    if (ouvrageDepollutionIds.length === 0) {
      return { data: [], total: 0 };
    }

    const sortBy = filters.sortBy ?? 'nbJoursRetard';
    const sortOrder = filters.sortOrder ?? 'DESC';

    const sortMap: Record<NonNullable<TransmissionASRetardSteuFilters['sortBy']>, string> = {
      nbJoursRetard: 'nb_jours_retard',
      ouvrageDepollutionCode: 'code_sandre',
      ouvrageDepollutionNom: 'nom',
      trancheObligationLibelle: 'tranche_obligation',
      capaciteNominaleEH: 'capacite_nominale',
      dateDernierFichierRecu: 'date_dernier_fichier_recu',
    };

    const sortColumn = sortMap[sortBy];
    if (!sortColumn) {
      throw new Error(`Invalid sortBy value: "${sortBy}"`);
    }

    const queryParams: Array<number | string | boolean> = [];
    const addParam = (value: number | string | boolean) => {
      queryParams.push(value);
      return `$${queryParams.length}`;
    };

    const anneePlaceholder = addParam(year);
    const steuPlaceholders = ouvrageDepollutionIds.map((cdn) => addParam(cdn)).join(', ');
    const anneeDebut = addParam(`${year}-01-01`);
    const anneeFin = addParam(`${year}-12-31`);
    const anneeSuivante = addParam(`${year + 1}-01-01`);
    const dateFallback = addParam(`${year}-01-01`);
    const dateFallbackRetard = addParam(`${year}-02-01`);

    const whereClauses = [`steu.steu_cdn IN (${steuPlaceholders})`];

    if (ouvrageDepollutionCode) {
      whereClauses.push(`RTRIM(steu.steu_sandre_cda) = ${addParam(ouvrageDepollutionCode)}`);
    }

    const baseQuery = `
      WITH params AS (SELECT ${anneePlaceholder}::int AS annee),
      base_data AS (
        SELECT
          RTRIM(steu.steu_sandre_cda)         AS code_sandre,
          steu.steu_nom_lb                    AS nom,
          tltobl.tltobl_lb                    AS tranche_obligation,
          cpy.cpy_eh_trait_nom_cap_mt         AS capacite_nominale,
          qual.suivqual_fic_nb               AS nb_fichiers_as_recus,
          qual.suivqual_der_trans_dt::date   AS date_dernier_fichier_recu,
          det.v_dep_suiv_reg_ref_deb_dt::date AS date_debut_periode,
          det.v_dep_suiv_reg_ref_fin_dt::date AS date_fin_periode,
          CASE
            WHEN reg.steureg_suiv_fin_dt IS NOT NULL
            THEN date_trunc('month', reg.steureg_suiv_fin_dt + interval '1 month')::date
            ELSE ${dateFallback}::date
          END AS date_mesure_suivante_attendue,
          CASE
            WHEN reg.steureg_suiv_fin_dt IS NOT NULL
            THEN date_part('day',
              NOW() - date_trunc('month', reg.steureg_suiv_fin_dt + interval '1 month')::date
            )
            ELSE extract(day FROM (NOW() - ${dateFallbackRetard}::date))
          END AS nb_jours_retard,
          itv.itv_mnemo_lb                    AS exploitant_nom,
          adr.adr_mail_lb                     AS exploitant_email,
          reg.steureg_mail_expl_dt            AS exploitant_date_envoi_mail
        FROM roseau.steu steu
        JOIN roseau.cxntech cxn
          ON cxn.aval_steu_cdn = steu.steu_cdn
          AND cxn.amont_zgc_cdn IS NOT NULL
          AND date_part('year', cxn.cxntech_creation_dt) <= (SELECT annee FROM params)
          AND (
            cxn.cxntech_retrait_dt IS NULL
            OR date_part('year', cxn.cxntech_retrait_dt) >= (SELECT annee FROM params)
          )
        JOIN roseau.aga aga
          ON aga.zgc_cdn = cxn.amont_zgc_cdn
        JOIN roseau.trobl trobl
          ON trobl.aga_cdn = aga.aga_cdn
          AND date_part('year', trobl.trobl_val_deb_dt) <= (SELECT annee FROM params)
          AND (
            trobl.trobl_val_fin_dt IS NULL
            OR date_part('year', trobl.trobl_val_fin_dt) >= (SELECT annee FROM params)
          )
        JOIN roseau.tltobl tltobl
          ON tltobl.tltobl_rfa = trobl.tltobl_rfa
        JOIN roseau.cpy cpy
          ON cpy.steu_cdn = steu.steu_cdn
          AND (
            (cpy.cpy_an = (SELECT annee FROM params) AND steu.steu_encours_an = (SELECT annee FROM params))
            OR (cpy.cpy_an = steu.steu_encours_an AND steu.steu_encours_an < (SELECT annee FROM params))
          )
        JOIN roseau.steureg reg
          ON reg.steu_cdn = steu.steu_cdn
          AND reg.steureg_an = (SELECT annee FROM params)
        JOIN roseau.suivqual qual
          ON qual.steu_cdn = steu.steu_cdn
          AND qual.suivqual_an = (SELECT annee FROM params)
        LEFT OUTER JOIN verseau.v_dep_suiv_reg det
          ON det.v_dep_cdn = reg.v_dep_cdn
        LEFT OUTER JOIN roseau.cxnadm exp
          ON exp.exp_steu_cdn = steu.steu_cdn
          AND exp.steu_itv_cdn IS NOT NULL
          AND (
            exp.cxnadm_creation_dt IS NULL
            OR exp.cxnadm_creation_dt <= ${anneeDebut}::date
          )
          AND (
            exp.cxnadm_retrait_dt IS NULL
            OR exp.cxnadm_retrait_dt > ${anneeFin}::date
          )
        LEFT OUTER JOIN lanceleau.itv itv
          ON itv.itv_cdn = exp.steu_itv_cdn
        LEFT OUTER JOIN lanceleau.adr adr
          ON adr.adr_cdn = itv.adr_cdn
        WHERE ${whereClauses.join(' AND ')}
      ),
      filtered_data AS (
        SELECT *
        FROM base_data
        WHERE nb_jours_retard > 0
          AND date_mesure_suivante_attendue < ${anneeSuivante}::date
      )
    `;

    const countRows = await this.dataSource.query<{ total: number | string }[]>(
      `${baseQuery} SELECT COUNT(*)::int AS total FROM filtered_data`,
      queryParams,
    );

    const dataQueryParams = [...queryParams];
    dataQueryParams.push(pageSize);
    const limitPlaceholder = `$${dataQueryParams.length}`;
    dataQueryParams.push((page - 1) * pageSize);
    const offsetPlaceholder = `$${dataQueryParams.length}`;

    const rows = await this.dataSource.query<TransmissionASRetardSteuRawRow[]>(
      `${baseQuery}
       SELECT
         code_sandre,
         nom,
         tranche_obligation,
         capacite_nominale,
         nb_fichiers_as_recus,
         date_dernier_fichier_recu,
         date_debut_periode,
         date_fin_periode,
         date_mesure_suivante_attendue,
         nb_jours_retard,
         exploitant_nom,
         exploitant_email,
         exploitant_date_envoi_mail
       FROM filtered_data
       ORDER BY ${sortColumn} ${sortOrder}, code_sandre ASC
       LIMIT ${limitPlaceholder}
       OFFSET ${offsetPlaceholder}`,
      dataQueryParams,
    );

    const formatDate = (value: Date | string | null) => {
      if (!value) return null;
      return typeof value === 'string' ? value.split('T')[0] : value.toISOString().split('T')[0];
    };

    return {
      data: rows.map((row) => ({
        ouvrageDepollutionCode: row.code_sandre?.trim() ?? '',
        ouvrageDepollutionNom: row.nom?.trim() ?? null,
        trancheObligationLibelle: row.tranche_obligation?.trim() ?? null,
        capaciteNominaleEH: row.capacite_nominale != null ? Number(row.capacite_nominale) : null,
        nbFichiersAsRecus: row.nb_fichiers_as_recus != null ? Number(row.nb_fichiers_as_recus) : null,
        dateDernierFichierRecu: formatDate(row.date_dernier_fichier_recu),
        dateDebutPeriode: formatDate(row.date_debut_periode),
        dateFinPeriode: formatDate(row.date_fin_periode),
        dateMesureSuivanteAttendue: formatDate(row.date_mesure_suivante_attendue),
        nbJoursRetard: row.nb_jours_retard != null ? Number(row.nb_jours_retard) : null,
        exploitantNom: row.exploitant_nom?.trim() ?? null,
        exploitantEmail: row.exploitant_email?.trim() ?? null,
        exploitantDateEnvoiMail: formatDate(row.exploitant_date_envoi_mail),
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async findTransmissionASRetardScl(
    filters: TransmissionASRetardSclFilters,
  ): Promise<{ data: TransmissionASRetardSclRow[]; total: number }> {
    const { systemeCollecteIds, year, page, pageSize, systemeCollecteCode } = filters;

    if (systemeCollecteIds.length === 0) {
      return { data: [], total: 0 };
    }

    const sortBy = filters.sortBy ?? 'nbJoursRetard';
    const sortOrder = filters.sortOrder ?? 'DESC';

    const sortMap: Record<NonNullable<TransmissionASRetardSclFilters['sortBy']>, string> = {
      nbJoursRetard: 'nb_jours_retard',
      systemeCollecteCode: 'code_sandre',
      systemeCollecteNom: 'nom',
      trancheObligationLibelle: 'tranche_obligation',
      capaciteNominaleEH: 'capacite_nominale',
      dateDernierFichierRecu: 'date_dernier_fichier_recu',
    };

    const sortColumn = sortMap[sortBy];
    if (!sortColumn) {
      throw new Error(`Invalid sortBy value: "${sortBy}"`);
    }

    const queryParams: Array<number | string | boolean> = [];
    const addParam = (value: number | string | boolean) => {
      queryParams.push(value);
      return `$${queryParams.length}`;
    };

    const anneePlaceholder = addParam(year);
    const sclPlaceholders = systemeCollecteIds.map((cdn) => addParam(cdn)).join(', ');
    const anneeDebut = addParam(`${year}-01-01`);
    const anneeFin = addParam(`${year}-12-31`);
    const anneeSuivante = addParam(`${year + 1}-01-01`);
    const dateFallback = addParam(`${year}-01-01`);
    const dateFallbackRetard = addParam(`${year}-02-01`);

    const whereClauses = [`scl.scl_cdn IN (${sclPlaceholders})`];

    if (systemeCollecteCode) {
      whereClauses.push(`RTRIM(scl.scl_sandre_cda) = ${addParam(systemeCollecteCode)}`);
    }

    const baseQuery = `
      WITH params AS (SELECT ${anneePlaceholder}::int AS annee),
      base_data AS (
        SELECT
          RTRIM(scl.scl_sandre_cda)           AS code_sandre,
          scl.scl_lb                          AS nom,
          tltobl.tltobl_lb                    AS tranche_obligation,
          cpy.cpy_eh_trait_nom_cap_mt         AS capacite_nominale,
          qual.suivqual_fic_nb               AS nb_fichiers_as_recus,
          qual.suivqual_der_trans_dt::date   AS date_dernier_fichier_recu,
          det.v_dep_suiv_reg_ref_deb_dt::date AS date_debut_periode,
          det.v_dep_suiv_reg_ref_fin_dt::date AS date_fin_periode,
          CASE
            WHEN reg.sclreg_suiv_fin_dt IS NOT NULL
            THEN date_trunc('month', reg.sclreg_suiv_fin_dt + interval '1 month')::date
            ELSE ${dateFallback}::date
          END AS date_mesure_suivante_attendue,
          CASE
            WHEN reg.sclreg_suiv_fin_dt IS NOT NULL
            THEN date_part('day',
              NOW() - date_trunc('month', reg.sclreg_suiv_fin_dt + interval '1 month')::date
            )
            ELSE extract(day FROM (NOW() - ${dateFallbackRetard}::date))
          END AS nb_jours_retard,
          itv.itv_mnemo_lb                    AS exploitant_nom,
          adr.adr_mail_lb                     AS exploitant_email,
          reg.sclreg_mail_expl_dt             AS exploitant_date_envoi_mail
        FROM roseau.scl scl
        JOIN roseau.steu steu
          ON steu.steu_cdn = scl.steu_cdn
        JOIN roseau.cxntech cxn
          ON cxn.aval_steu_cdn = steu.steu_cdn
          AND cxn.amont_zgc_cdn IS NOT NULL
          AND date_part('year', cxn.cxntech_creation_dt) <= (SELECT annee FROM params)
          AND (
            cxn.cxntech_retrait_dt IS NULL
            OR date_part('year', cxn.cxntech_retrait_dt) >= (SELECT annee FROM params)
          )
        JOIN roseau.aga aga
          ON aga.zgc_cdn = cxn.amont_zgc_cdn
        JOIN roseau.trobl trobl
          ON trobl.aga_cdn = aga.aga_cdn
          AND date_part('year', trobl.trobl_val_deb_dt) <= (SELECT annee FROM params)
          AND (
            trobl.trobl_val_fin_dt IS NULL
            OR date_part('year', trobl.trobl_val_fin_dt) >= (SELECT annee FROM params)
          )
        JOIN roseau.tltobl tltobl
          ON tltobl.tltobl_rfa = trobl.tltobl_rfa
        JOIN roseau.cpy cpy
          ON cpy.steu_cdn = steu.steu_cdn
          AND (
            (cpy.cpy_an = (SELECT annee FROM params) AND steu.steu_encours_an = (SELECT annee FROM params))
            OR (cpy.cpy_an = steu.steu_encours_an AND steu.steu_encours_an < (SELECT annee FROM params))
          )
        JOIN roseau.sclreg reg
          ON reg.scl_cdn = scl.scl_cdn
          AND reg.sclreg_an = (SELECT annee FROM params)
        JOIN roseau.suivqual qual
          ON qual.scl_cdn = scl.scl_cdn
          AND qual.suivqual_an = (SELECT annee FROM params)
        LEFT OUTER JOIN verseau.v_dep_suiv_reg det
          ON det.v_dep_cdn = reg.v_dep_cdn
        LEFT OUTER JOIN roseau.cxnadm exp
          ON exp.exp_steu_cdn = steu.steu_cdn
          AND exp.steu_itv_cdn IS NOT NULL
          AND (
            exp.cxnadm_creation_dt IS NULL
            OR exp.cxnadm_creation_dt <= ${anneeDebut}::date
          )
          AND (
            exp.cxnadm_retrait_dt IS NULL
            OR exp.cxnadm_retrait_dt > ${anneeFin}::date
          )
        LEFT OUTER JOIN lanceleau.itv itv
          ON itv.itv_cdn = exp.steu_itv_cdn
        LEFT OUTER JOIN lanceleau.adr adr
          ON adr.adr_cdn = itv.adr_cdn
        WHERE ${whereClauses.join(' AND ')}
      ),
      filtered_data AS (
        SELECT *
        FROM base_data
        WHERE nb_jours_retard > 0
          AND date_mesure_suivante_attendue < ${anneeSuivante}::date
      )
    `;

    const countRows = await this.dataSource.query<{ total: number | string }[]>(
      `${baseQuery} SELECT COUNT(*)::int AS total FROM filtered_data`,
      queryParams,
    );

    const dataQueryParams = [...queryParams];
    dataQueryParams.push(pageSize);
    const limitPlaceholder = `$${dataQueryParams.length}`;
    dataQueryParams.push((page - 1) * pageSize);
    const offsetPlaceholder = `$${dataQueryParams.length}`;

    const rows = await this.dataSource.query<TransmissionASRetardSclRawRow[]>(
      `${baseQuery}
       SELECT
         code_sandre,
         nom,
         tranche_obligation,
         capacite_nominale,
         nb_fichiers_as_recus,
         date_dernier_fichier_recu,
         date_debut_periode,
         date_fin_periode,
         date_mesure_suivante_attendue,
         nb_jours_retard,
         exploitant_nom,
         exploitant_email,
         exploitant_date_envoi_mail
       FROM filtered_data
       ORDER BY ${sortColumn} ${sortOrder}, code_sandre ASC
       LIMIT ${limitPlaceholder}
       OFFSET ${offsetPlaceholder}`,
      dataQueryParams,
    );

    const formatDate = (value: Date | string | null) => {
      if (!value) return null;
      return typeof value === 'string' ? value.split('T')[0] : value.toISOString().split('T')[0];
    };

    return {
      data: rows.map((row) => ({
        systemeCollecteCode: row.code_sandre?.trim() ?? '',
        systemeCollecteNom: row.nom?.trim() ?? null,
        trancheObligationLibelle: row.tranche_obligation?.trim() ?? null,
        capaciteNominaleEH: row.capacite_nominale != null ? Number(row.capacite_nominale) : null,
        nbFichiersAsRecus: row.nb_fichiers_as_recus != null ? Number(row.nb_fichiers_as_recus) : null,
        dateDernierFichierRecu: formatDate(row.date_dernier_fichier_recu),
        dateDebutPeriode: formatDate(row.date_debut_periode),
        dateFinPeriode: formatDate(row.date_fin_periode),
        dateMesureSuivanteAttendue: formatDate(row.date_mesure_suivante_attendue),
        nbJoursRetard: row.nb_jours_retard != null ? Number(row.nb_jours_retard) : null,
        exploitantNom: row.exploitant_nom?.trim() ?? null,
        exploitantEmail: row.exploitant_email?.trim() ?? null,
        exploitantDateEnvoiMail: formatDate(row.exploitant_date_envoi_mail),
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async findEvenementTypes(): Promise<NomenclatureItem[]> {
    const rows = await this.tlrefRepository
      .createQueryBuilder('tlref')
      .where('tlref.trl_rfa = :trlRfa', { trlRfa: 'LREF_46' })
      .andWhere('tlref.tlref_elt_cda IN (:...codes)', { codes: ['1', '2', '3', '4'] })
      .orderBy('tlref.tlref_elt_cda', 'ASC')
      .getMany();

    return rows.map((r) => ({
      elementNomenclatureCode: r.tlrefEltCda?.trim() ?? '',
      elementNomenclatureLibelle: r.tlrefMnemoLb?.trim() ?? null,
    }));
  }

  async findPointsMesureBySystemesCollecte(systemeCollecteIds: number[]): Promise<PointMesure[]> {
    if (systemeCollecteIds.length === 0) return [];

    const rows = await this.pmoRepository
      .createQueryBuilder('pmo')
      .select('pmo.pmo_cdn', 'pmo_cdn')
      .addSelect('pmo.pmo_no', 'pmo_no')
      .addSelect('pmo.pmo_lb', 'pmo_lb')
      .innerJoin(SclEntity, 'scl', 'scl.scl_cdn = pmo.scl_cdn')
      .where('scl.scl_cdn IN (:...systemeCollecteIds)', { systemeCollecteIds })
      .orderBy('pmo.pmo_no', 'ASC')
      .getRawMany<{ pmo_cdn: number; pmo_no: string; pmo_lb: string | null }>();

    return rows.map((r) => ({
      pointMesureId: r.pmo_cdn,
      pointMesureNumero: r.pmo_no?.trim() ?? '',
      pointMesureLibelle: r.pmo_lb?.trim() ?? null,
    }));
  }

  async findNomenclatureByRfa(trlRfa: string): Promise<NomenclatureItem[]> {
    const rows = await this.tlrefRepository
      .createQueryBuilder('tlref')
      .where('tlref.trl_rfa = :trlRfa', { trlRfa })
      .orderBy('tlref.tlref_elt_cda', 'ASC')
      .getMany();

    return rows.map((r) => ({
      elementNomenclatureCode: r.tlrefEltCda?.trim() ?? '',
      elementNomenclatureLibelle: r.tlrefMnemoLb?.trim() ?? null,
    }));
  }

  async findStatuts(): Promise<NomenclatureItem[]> {
    return this.findNomenclatureByRfa('LREF_20');
  }

  async findQualifications(): Promise<NomenclatureItem[]> {
    return this.findNomenclatureByRfa('LREF_18');
  }

  async findPointsMesureReferentiel(
    ouvrageType: 'steu' | 'scl',
    ouvrageCode: string,
    filters: { dateDebut?: string; dateFin?: string; localisationCodes?: string[] },
  ): Promise<PointMesureReferentielRow[]> {
    if (ouvrageType === 'steu') {
      return this.findPointsMesureReferentielSteu(ouvrageCode, filters);
    }
    return this.findPointsMesureReferentielScl(ouvrageCode, filters);
  }

  private async findPointsMesureReferentielSteu(
    ouvrageCode: string,
    filters: { dateDebut?: string; dateFin?: string; localisationCodes?: string[] },
  ): Promise<PointMesureReferentielRow[]> {
    const qb = this.pmoRepository
      .createQueryBuilder('pmo')
      .select('steu.steu_sandre_cda', 'ouvrage_sandre_cda')
      .addSelect('steu.steu_nom_lb', 'ouvrage_nom')
      .addSelect('pmo.pmo_ae_cda', 'identifiant_agence')
      .addSelect('pmo.pmo_no', 'numero_point')
      .addSelect('pmo.pmo_lb', 'nom_point')
      .addSelect('t16.tlref_elt_cda', 'localisation_code')
      .addSelect('t16.tlref_mnemo_lb', 'localisation_globale')
      .addSelect('pmo.pmo_val_deb_dt', 'date_debut')
      .addSelect('pmo.pmo_val_fin_dt', 'date_fin')
      .innerJoin(SteuEntity, 'steu', 'steu.steu_cdn = pmo.steu_cdn')
      .innerJoin(TlrefEntity, 't16', 't16.tlref_cdn = pmo.tlref_16_cdn')
      .where('steu.tlref_10_cdn IN (:...tlref10Cdns)', { tlref10Cdns: [40, 41] })
      .andWhere('steu.steu_sandre_cda = :ouvrageCode', { ouvrageCode });

    this.applyPointsMesureFilters(qb, filters);

    qb.orderBy('steu.steu_sandre_cda', 'ASC').addOrderBy('steu.steu_nom_lb', 'ASC').addOrderBy('pmo.pmo_no', 'ASC');

    const rows = await qb.getRawMany<{
      ouvrage_sandre_cda: string;
      ouvrage_nom: string | null;
      identifiant_agence: string | null;
      numero_point: string | null;
      nom_point: string | null;
      localisation_code: string | null;
      localisation_globale: string | null;
      date_debut: Date | null;
      date_fin: Date | null;
    }>();

    return rows.map((r) => ({
      ouvrageDepollutionCode: r.ouvrage_sandre_cda?.trim() ?? '',
      ouvrageDepollutionNom: r.ouvrage_nom?.trim() ?? null,
      pointAgenceEauNumero: r.identifiant_agence?.trim() ?? null,
      pointMesureNumero: r.numero_point?.trim() ?? null,
      pointMesureLibelle: r.nom_point?.trim() ?? null,
      pointMesureLocalisationCode: r.localisation_code?.trim() ?? null,
      pointMesureLocalisationLibelle: r.localisation_globale?.trim() ?? null,
      pointMesureCategorieSystemeCollecte: null,
      pointMesureValiditeDebutDate: toISODateOrNull(r.date_debut),
      pointMesureValiditeFinDate: toISODateOrNull(r.date_fin),
    }));
  }

  private async findPointsMesureReferentielScl(
    ouvrageCode: string,
    filters: { dateDebut?: string; dateFin?: string; localisationCodes?: string[] },
  ): Promise<PointMesureReferentielRow[]> {
    const qb = this.pmoRepository
      .createQueryBuilder('pmo')
      .select('scl.scl_sandre_cda', 'ouvrage_sandre_cda')
      .addSelect('scl.scl_lb', 'ouvrage_nom')
      .addSelect('pmo.pmo_ae_cda', 'identifiant_agence')
      .addSelect('pmo.pmo_no', 'numero_point')
      .addSelect('pmo.pmo_lb', 'nom_point')
      .addSelect('t16.tlref_elt_cda', 'localisation_code')
      .addSelect('t16.tlref_mnemo_lb', 'localisation_globale')
      .addSelect('t24.tlref_mnemo_lb', 'categorie')
      .addSelect('pmo.pmo_val_deb_dt', 'date_debut')
      .addSelect('pmo.pmo_val_fin_dt', 'date_fin')
      .innerJoin(SclEntity, 'scl', 'scl.scl_cdn = pmo.scl_cdn')
      .innerJoin(SteuEntity, 'steu', 'steu.steu_cdn = scl.steu_cdn')
      .innerJoin(TlrefEntity, 't16', 't16.tlref_cdn = pmo.tlref_16_cdn')
      .leftJoin(OrmEntity, 'orm', 'orm.pmo_cdn = pmo.pmo_cdn')
      .leftJoin(TlrefEntity, 't24', 't24.tlref_cdn = orm.tlref_24_cdn')
      .where('steu.tlref_10_cdn IN (:...tlref10Cdns)', { tlref10Cdns: [40, 41] })
      .andWhere('scl.scl_sandre_cda = :ouvrageCode', { ouvrageCode });

    this.applyPointsMesureFilters(qb, filters);

    qb.orderBy('scl.scl_sandre_cda', 'ASC').addOrderBy('scl.scl_lb', 'ASC').addOrderBy('pmo.pmo_no', 'ASC');

    const rows = await qb.getRawMany<{
      ouvrage_sandre_cda: string;
      ouvrage_nom: string | null;
      identifiant_agence: string | null;
      numero_point: string | null;
      nom_point: string | null;
      localisation_code: string | null;
      localisation_globale: string | null;
      categorie: string | null;
      date_debut: Date | null;
      date_fin: Date | null;
    }>();

    return rows.map((r) => ({
      ouvrageDepollutionCode: r.ouvrage_sandre_cda?.trim() ?? '',
      ouvrageDepollutionNom: r.ouvrage_nom?.trim() ?? null,
      pointAgenceEauNumero: r.identifiant_agence?.trim() ?? null,
      pointMesureNumero: r.numero_point?.trim() ?? null,
      pointMesureLibelle: r.nom_point?.trim() ?? null,
      pointMesureLocalisationCode: r.localisation_code?.trim() ?? null,
      pointMesureLocalisationLibelle: r.localisation_globale?.trim() ?? null,
      pointMesureCategorieSystemeCollecte: r.categorie?.trim() ?? null,
      pointMesureValiditeDebutDate: toISODateOrNull(r.date_debut),
      pointMesureValiditeFinDate: toISODateOrNull(r.date_fin),
    }));
  }

  private applyPointsMesureFilters(
    qb: SelectQueryBuilder<PmoEntity>,
    filters: { dateDebut?: string; dateFin?: string; localisationCodes?: string[] },
  ): void {
    if (filters.dateDebut) {
      qb.andWhere('(pmo.pmo_val_fin_dt IS NULL OR pmo.pmo_val_fin_dt >= :dateDebut)', { dateDebut: filters.dateDebut });
    }
    if (filters.dateFin) {
      qb.andWhere('(pmo.pmo_val_deb_dt IS NULL OR pmo.pmo_val_deb_dt <= :dateFin)', { dateFin: filters.dateFin });
    }
    if (filters.localisationCodes && filters.localisationCodes.length > 0) {
      qb.andWhere('t16.tlref_elt_cda IN (:...localisationCodes)', {
        localisationCodes: filters.localisationCodes,
      });
    }
  }
}
