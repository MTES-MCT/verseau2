import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import {
  SclDetailRow,
  SteuDetailRow,
  type OuvrageIntervenantRole,
  CmaBySandreCdaAndParam,
  CapaciteNominaleBySandreCda,
  MaxDebitBySandreCda,
  ChargeEntranteMaxComparison,
  ProductionBoueZero,
  PointMesure,
  ParametreMesure,
  NomenclatureItem,
  SclRef,
  SteuRef,
} from '@masa/masa.dto';
import { toISODateOrNull } from '@lib/shared';
import { ParEntity } from '@referentiel/lanceleau/entities/par.entity';

interface OuvrageRawDetailRow {
  code: string;
  date_mise_en_service?: Date | string | null;
  role: OuvrageIntervenantRole;
  intervenant_nom: string | null;
  intervenant_siret: string | null;
}

function trimToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

@Injectable()
export class RoseauRepository implements RoseauGateway {
  constructor(
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

  async findSteuBySandreCda(sandreCda: string): Promise<SteuEntity | null> {
    return this.steuRepository.findOne({ where: { steuSandreCda: sandreCda } });
  }

  async findSteusBySandreCdas(sandreCdas: string[], search?: string, limit?: number): Promise<SteuRef[]> {
    if (sandreCdas.length === 0) return [];

    const query = this.steuRepository
      .createQueryBuilder('steu')
      .where('steu.steu_sandre_cda = ANY(:sandreCdas)', { sandreCdas });

    if (search?.trim()) {
      const normalizedSearch = `%${search.trim().toLowerCase()}%`;
      query
        .andWhere("(LOWER(steu.steu_sandre_cda) LIKE :search OR LOWER(COALESCE(steu.steu_nom_lb, '')) LIKE :search)", {
          search: normalizedSearch,
        })
        .orderBy('steu.steu_nom_lb', 'ASC', 'NULLS LAST')
        .addOrderBy('steu.steu_sandre_cda', 'ASC')
        .limit(limit ?? 20);
    }

    const rows = await query.getMany();

    return rows.map((s) => ({
      ouvrageDepollutionCode: s.steuSandreCda?.trim() ?? '',
      ouvrageDepollutionId: s.steuCdn,
      ouvrageDepollutionNom: s.steuNomLb?.trim() ?? null,
    }));
  }

  async findSclsBySandreCdas(sandreCdas: string[], search?: string, limit?: number): Promise<SclRef[]> {
    if (sandreCdas.length === 0) return [];

    const query = this.sclRepository
      .createQueryBuilder('scl')
      .where('scl.scl_sandre_cda = ANY(:sandreCdas)', { sandreCdas });

    if (search?.trim()) {
      const normalizedSearch = `%${search.trim().toLowerCase()}%`;
      query
        .andWhere("(LOWER(scl.scl_sandre_cda) LIKE :search OR LOWER(COALESCE(scl.scl_lb, '')) LIKE :search)", {
          search: normalizedSearch,
        })
        .orderBy('scl.scl_lb', 'ASC', 'NULLS LAST')
        .addOrderBy('scl.scl_sandre_cda', 'ASC')
        .limit(limit ?? 20);
    }

    const rows = await query.getMany();

    return rows.map((scl) => ({
      systemeCollecteCode: scl.sclSandreCda?.trim() ?? '',
      systemeCollecteId: scl.sclCdn,
      systemeCollecteNom: scl.sclLb?.trim() ?? null,
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
        capaciteNominaleEH: row.capacite_nominale!,
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

  async findPointsMesureByOuvrage(
    ouvrageType: 'steu' | 'scl',
    ouvrageCode: string,
    filters?: { localisationCodes?: string[] },
  ): Promise<PointMesure[]> {
    const qb = this.pmoRepository
      .createQueryBuilder('pmo')
      .select('pmo.pmo_cdn', 'pmo_cdn')
      .addSelect('pmo.pmo_no', 'pmo_no')
      .addSelect('pmo.pmo_lb', 'pmo_lb')
      .leftJoin(TlrefEntity, 't16', 't16.tlref_cdn = pmo.tlref_16_cdn')
      .addSelect('t16.tlref_elt_cda', 'localisation_globale');

    if (ouvrageType === 'scl') {
      qb.innerJoin(SclEntity, 'scl', 'scl.scl_cdn = pmo.scl_cdn').where('scl.scl_sandre_cda = :ouvrageCode', {
        ouvrageCode,
      });
    } else {
      qb.innerJoin(SteuEntity, 'steu', 'steu.steu_cdn = pmo.steu_cdn').where('steu.steu_sandre_cda = :ouvrageCode', {
        ouvrageCode,
      });
    }

    if (filters?.localisationCodes && filters.localisationCodes.length > 0) {
      qb.andWhere('t16.tlref_elt_cda IN (:...localisationCodes)', { localisationCodes: filters.localisationCodes });
    }

    qb.orderBy('pmo.pmo_no', 'ASC');

    const rows = await qb.getRawMany<{
      pmo_cdn: number;
      pmo_no: string;
      pmo_lb: string | null;
      localisation_globale: string | null;
    }>();
    return rows.map((r) => ({
      pointMesureId: r.pmo_cdn,
      pointMesureNumero: r.pmo_no?.trim() ?? '',
      pointMesureLibelle: r.pmo_lb?.trim() ?? null,
      pointMesureLocalisationGlobale: r.localisation_globale?.trim() ?? null,
    }));
  }

  async findSteuDetail(ouvrageDepollutionCode: string): Promise<SteuDetailRow | null> {
    const rows = await this.steuRepository.query<OuvrageRawDetailRow[]>(
      `
        WITH target AS (
          SELECT
            steu.steu_cdn,
            RTRIM(steu.steu_sandre_cda) AS code,
            steu.steu_serv_en_mise_dt AS date_mise_en_service
          FROM roseau.steu steu
          WHERE RTRIM(steu.steu_sandre_cda) = BTRIM($1)
        )
        SELECT DISTINCT
          target.code,
          target.date_mise_en_service,
          'exploitant' AS role,
          COALESCE(NULLIF(BTRIM(itv.itv_nom_lb), ''), NULLIF(BTRIM(itv.itv_mnemo_lb), '')) AS intervenant_nom,
          NULLIF(BTRIM(itv.itv_rfa), '') AS intervenant_siret
        FROM target
        LEFT JOIN roseau.cxnadm cx
          ON cx.exp_steu_cdn = target.steu_cdn
         AND cx.steu_itv_cdn IS NOT NULL
         AND cx.cxnadm_retrait_dt IS NULL
        LEFT JOIN lanceleau.itv itv
          ON itv.itv_cdn = cx.steu_itv_cdn
        UNION ALL
        SELECT DISTINCT
          target.code,
          target.date_mise_en_service,
          'maitre_ouvrage' AS role,
          COALESCE(NULLIF(BTRIM(itv.itv_nom_lb), ''), NULLIF(BTRIM(itv.itv_mnemo_lb), '')) AS intervenant_nom,
          NULLIF(BTRIM(itv.itv_rfa), '') AS intervenant_siret
        FROM target
        LEFT JOIN roseau.cxnadm cx
          ON cx.mo_steu_cdn = target.steu_cdn
         AND cx.steu_itv_cdn IS NOT NULL
         AND cx.cxnadm_retrait_dt IS NULL
        LEFT JOIN lanceleau.itv itv
          ON itv.itv_cdn = cx.steu_itv_cdn
        ORDER BY role, intervenant_nom NULLS LAST, intervenant_siret NULLS LAST
      `,
      [ouvrageDepollutionCode],
    );

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      ouvrageDepollutionCode: row.code?.trim() ?? '',
      dateMiseEnService: toISODateOrNull(row.date_mise_en_service ?? null) ?? null,
      intervenants: rows
        .map((detailRow) => ({
          role: detailRow.role,
          intervenantNom: trimToNull(detailRow.intervenant_nom),
          intervenantSiret: trimToNull(detailRow.intervenant_siret),
        }))
        .filter((intervenant) => intervenant.intervenantNom !== null || intervenant.intervenantSiret !== null),
    };
  }

  async findSclDetail(systemeCollecteCode: string): Promise<SclDetailRow | null> {
    const rows = await this.sclRepository.query<OuvrageRawDetailRow[]>(
      `
        WITH target AS (
          SELECT
            scl.scl_cdn,
            RTRIM(scl.scl_sandre_cda) AS code
          FROM roseau.scl scl
          WHERE RTRIM(scl.scl_sandre_cda) = BTRIM($1)
        )
        SELECT DISTINCT
          target.code,
          'exploitant' AS role,
          COALESCE(NULLIF(BTRIM(itv.itv_nom_lb), ''), NULLIF(BTRIM(itv.itv_mnemo_lb), '')) AS intervenant_nom,
          NULLIF(BTRIM(itv.itv_rfa), '') AS intervenant_siret
        FROM target
        LEFT JOIN roseau.cxnadm cx
          ON cx.exp_scl_cdn = target.scl_cdn
         AND cx.scl_itv_cdn IS NOT NULL
         AND cx.cxnadm_retrait_dt IS NULL
        LEFT JOIN lanceleau.itv itv
          ON itv.itv_cdn = cx.scl_itv_cdn
        UNION ALL
        SELECT DISTINCT
          target.code,
          'maitre_ouvrage' AS role,
          COALESCE(NULLIF(BTRIM(itv.itv_nom_lb), ''), NULLIF(BTRIM(itv.itv_mnemo_lb), '')) AS intervenant_nom,
          NULLIF(BTRIM(itv.itv_rfa), '') AS intervenant_siret
        FROM target
        LEFT JOIN roseau.cxnadm cx
          ON cx.mo_scl_cdn = target.scl_cdn
         AND cx.scl_itv_cdn IS NOT NULL
         AND cx.cxnadm_retrait_dt IS NULL
        LEFT JOIN lanceleau.itv itv
          ON itv.itv_cdn = cx.scl_itv_cdn
        ORDER BY role, intervenant_nom NULLS LAST, intervenant_siret NULLS LAST
      `,
      [systemeCollecteCode],
    );

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      systemeCollecteCode: row.code?.trim() ?? '',
      intervenants: rows
        .map((detailRow) => ({
          role: detailRow.role,
          intervenantNom: trimToNull(detailRow.intervenant_nom),
          intervenantSiret: trimToNull(detailRow.intervenant_siret),
        }))
        .filter((intervenant) => intervenant.intervenantNom !== null || intervenant.intervenantSiret !== null),
    };
  }

  async findParametresByOuvrageAndPmo(
    ouvrageType: 'steu' | 'scl',
    ouvrageCode: string,
    pmoCdn?: number,
  ): Promise<ParametreMesure[]> {
    const qb = this.alrRepository
      .createQueryBuilder('alr')
      .select('alr.par_rfa', 'par_rfa')
      .addSelect('par.par_court_nom_lb', 'par_court_nom_lb')
      .innerJoin(PleEntity, 'ple', 'ple.ple_cdn = alr.ple_cdn')
      .innerJoin(PmoEntity, 'pmo', 'pmo.pmo_cdn = ple.pmo_cdn')
      .innerJoin(ParEntity, 'par', 'par.par_rfa = alr.par_rfa')
      .where('1 = 1');

    if (pmoCdn !== undefined) {
      qb.andWhere('pmo.pmo_cdn = :pmoCdn', { pmoCdn });
    }

    if (ouvrageType === 'scl') {
      qb.innerJoin(SclEntity, 'scl', 'scl.scl_cdn = pmo.scl_cdn').andWhere('scl.scl_sandre_cda = :ouvrageCode', {
        ouvrageCode,
      });
    } else {
      qb.innerJoin(SteuEntity, 'steu', 'steu.steu_cdn = pmo.steu_cdn').andWhere('steu.steu_sandre_cda = :ouvrageCode', {
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

  async findParametresByCodes(codes: string[]): Promise<ParametreMesure[]> {
    if (codes.length === 0) {
      return [];
    }

    const rows = await this.alrRepository.manager
      .getRepository(ParEntity)
      .createQueryBuilder('par')
      .select('par.par_rfa', 'par_rfa')
      .addSelect('par.par_court_nom_lb', 'par_court_nom_lb')
      .where('par.par_rfa IN (:...codes)', { codes })
      .orderBy('par.par_rfa', 'ASC')
      .getRawMany<{ par_rfa: string; par_court_nom_lb: string | null }>();

    const rowsByCode = new Map(rows.map((row) => [row.par_rfa?.trim() ?? '', row] as const));

    return codes.flatMap((code) => {
      const row = rowsByCode.get(code);
      if (!row) {
        return [];
      }

      return {
        parametreAnalyseCode: row.par_rfa?.trim() ?? '',
        parametreNomCourt: row.par_court_nom_lb?.trim() ?? null,
      };
    });
  }

  async findPointsMesureBySystemesCollecte(systemeCollecteIds: number[]): Promise<PointMesure[]> {
    if (systemeCollecteIds.length === 0) return [];

    const rows = await this.pmoRepository
      .createQueryBuilder('pmo')
      .select('pmo.pmo_cdn', 'pmo_cdn')
      .addSelect('pmo.pmo_no', 'pmo_no')
      .addSelect('pmo.pmo_lb', 'pmo_lb')
      .leftJoin(TlrefEntity, 't16', 't16.tlref_cdn = pmo.tlref_16_cdn')
      .addSelect('t16.tlref_elt_cda', 'localisation_globale')
      .innerJoin(SclEntity, 'scl', 'scl.scl_cdn = pmo.scl_cdn')
      .where('scl.scl_cdn IN (:...systemeCollecteIds)', { systemeCollecteIds })
      .orderBy('pmo.pmo_no', 'ASC')
      .getRawMany<{
        pmo_cdn: number;
        pmo_no: string;
        pmo_lb: string | null;
        localisation_globale: string | null;
      }>();

    return rows.map((r) => ({
      pointMesureId: r.pmo_cdn,
      pointMesureNumero: r.pmo_no?.trim() ?? '',
      pointMesureLibelle: r.pmo_lb?.trim() ?? null,
      pointMesureLocalisationGlobale: r.localisation_globale?.trim() ?? null,
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
}
