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
import { ParEntity } from '@referentiel/lanceleau/entities/par.entity';
import { UrfEntity } from '@referentiel/lanceleau/entities/urf.entity';

@Injectable()
export class RoseauRepository implements RoseauGateway {
  constructor(
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
    @InjectRepository(CxntechEntity)
    private readonly cxntechRepository: Repository<CxntechEntity>,
    @InjectRepository(CpyEntity)
    private readonly cpyRepository: Repository<CpyEntity>,
    @InjectRepository(ResaEntity)
    private readonly resaRepository: Repository<ResaEntity>,
    @InjectRepository(StchanEntity)
    private readonly stchanRepository: Repository<StchanEntity>,
    @InjectRepository(PleEntity)
    private readonly pleRepository: Repository<PleEntity>,
    @InjectRepository(AlrEntity)
    private readonly alrRepository: Repository<AlrEntity>,
  ) {}

  async findSteu(): Promise<SteuEntity[]> {
    return this.steuRepository.find();
  }

  async findSclBySandreCda(sandreCda: string): Promise<SclEntity | null> {
    return this.sclRepository.findOne({ where: { sclSandreCda: sandreCda } });
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
    return rows.map((s) => ({ sandreCda: s.steuSandreCda, steuCdn: s.steuCdn }));
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
      sandreCda: row.steu_sandre_cda.trim(),
      paramCode: row.par_rfa.trim(),
      value: parseFloat(row.resa_cma_val),
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
      const maxDebit = Math.max(pc95, dref);
      if (maxDebit > 0) {
        result.push({ sandreCda: row.steu_sandre_cda.trim(), maxDebit });
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
      sandreCda: r.steu_sandre_cda.trim(),
      chargeMaxN: parseFloat(r.charge_max_n.toString()),
      chargeMaxNMoins1: parseFloat(r.charge_max_n1.toString()),
      trancheLabel: r.tranche_label.trim(),
      annee: parseInt(r.annee.toString(), 10),
    }));
  }

  async findMesures(filters: MesureFilters): Promise<{ data: MesureRow[]; total: number }> {
    const { steuSandreCdas, dateDebut, dateFin, parametreCode, qualification, finalite, page, pageSize } = filters;
    const sortBy = filters.sortBy ?? 'default';
    const sortOrder = filters.sortOrder ?? 'ASC';

    const buildBaseQuery = () =>
      this.alrRepository
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

    const applyFilters = (qb: ReturnType<typeof buildBaseQuery>) => {
      if (steuSandreCdas.length > 0) {
        qb.andWhere('steu.steu_sandre_cda IN (:...steuSandreCdas)', { steuSandreCdas });
      }
      if (dateDebut) {
        qb.andWhere('ple.ple_prelev_dt >= :dateDebut', { dateDebut });
      }
      if (dateFin) {
        qb.andWhere('ple.ple_prelev_dt <= :dateFin', { dateFin });
      }
      if (parametreCode) {
        qb.andWhere('par.par_rfa = :parametreCode', { parametreCode });
      }
      if (qualification) {
        qb.andWhere('t18.tlref_elt_cda = :qualification', { qualification });
      }
      if (finalite) {
        qb.andWhere('t17.tlref_elt_cda = :finalite', { finalite });
      }
      return qb;
    };

    const countQb = applyFilters(buildBaseQuery());
    const total = await countQb.getCount();

    const dataQb = applyFilters(buildBaseQuery())
      .select('steu.steu_sandre_cda', 'steu_sandre_cda')
      .addSelect('steu.steu_nom_lb', 'steu_nom')
      .addSelect('scl.scl_sandre_cda', 'scl_sandre_cda')
      .addSelect('scl.scl_lb', 'scl_nom')
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

    if (sortBy === 'default') {
      dataQb
        .orderBy('scl.scl_lb', sortOrder)
        .addOrderBy('t16.tlref_elt_cda', sortOrder)
        .addOrderBy('pmo.pmo_no', sortOrder)
        .addOrderBy('ple.ple_prelev_dt', sortOrder)
        .addOrderBy('par.par_rfa', sortOrder);
    } else {
      dataQb.orderBy(sortBy, sortOrder);
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
      steuSandreCda: r.steu_sandre_cda?.trim() ?? '',
      steuNom: r.steu_nom?.trim() ?? null,
      sclSandreCda: r.scl_sandre_cda?.trim() ?? null,
      sclNom: r.scl_nom?.trim() ?? null,
      localisationPoint: r.localisation_point?.trim() ?? null,
      numPointAgence: r.num_point_agence?.trim() ?? null,
      numPoint: r.num_point?.trim() ?? null,
      nomPoint: r.nom_point?.trim() ?? null,
      date: r.date ? new Date(r.date) : null,
      parametreCode: r.parametre_code?.trim() ?? '',
      parametreNom: r.parametre_nom?.trim() ?? null,
      valeur: r.valeur !== null && r.valeur !== undefined ? parseFloat(r.valeur) : null,
      unite: r.unite?.trim() ?? null,
      finalite: r.finalite?.trim() ?? null,
      statut: r.statut?.trim() ?? null,
      qualification: r.qualification?.trim() ?? null,
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
      steuSandreCda: s.steuSandreCda?.trim() ?? '',
      steuNom: s.steuNomLb?.trim() ?? null,
    }));
  }

  async findPointsMesureBySandreCda(steuSandreCda: string): Promise<PointMesure[]> {
    const rows = await this.pmoRepository
      .createQueryBuilder('pmo')
      .select('pmo.pmo_cdn', 'pmo_cdn')
      .addSelect('pmo.pmo_no', 'pmo_no')
      .addSelect('pmo.pmo_lb', 'pmo_lb')
      .leftJoin(SteuEntity, 'steu_direct', 'steu_direct.steu_cdn = pmo.steu_cdn')
      .leftJoin(SclEntity, 'scl', 'scl.scl_cdn = pmo.scl_cdn')
      .leftJoin(SteuEntity, 'steu_scl', 'steu_scl.steu_cdn = scl.steu_cdn')
      .where('steu_direct.steu_sandre_cda = :steuSandreCda OR steu_scl.steu_sandre_cda = :steuSandreCda', {
        steuSandreCda,
      })
      .orderBy('pmo.pmo_no', 'ASC')
      .getRawMany<{ pmo_cdn: number; pmo_no: string; pmo_lb: string | null }>();
    return rows.map((r) => ({
      pmoCdn: r.pmo_cdn,
      pmoNo: r.pmo_no?.trim() ?? '',
      pmoLb: r.pmo_lb?.trim() ?? null,
    }));
  }

  async findParametresBySteuAndPmo(steuSandreCda: string, pmoCdn: number): Promise<ParametreMesure[]> {
    const rows = await this.alrRepository
      .createQueryBuilder('alr')
      .select('alr.par_rfa', 'par_rfa')
      .addSelect('par.par_court_nom_lb', 'par_court_nom_lb')
      .innerJoin(PleEntity, 'ple', 'ple.ple_cdn = alr.ple_cdn')
      .innerJoin(PmoEntity, 'pmo', 'pmo.pmo_cdn = ple.pmo_cdn')
      .innerJoin(SclEntity, 'scl', 'scl.scl_cdn = pmo.scl_cdn')
      .innerJoin(SteuEntity, 'steu', 'steu.steu_cdn = scl.steu_cdn')
      .innerJoin(ParEntity, 'par', 'par.par_rfa = alr.par_rfa')
      .where('steu.steu_sandre_cda = :steuSandreCda', { steuSandreCda })
      .andWhere('pmo.pmo_cdn = :pmoCdn', { pmoCdn })
      .distinct(true)
      .orderBy('alr.par_rfa', 'ASC')
      .getRawMany<{ par_rfa: string; par_court_nom_lb: string | null }>();
    return rows.map((r) => ({
      parRfa: r.par_rfa?.trim() ?? '',
      parCourtNomLb: r.par_court_nom_lb?.trim() ?? null,
    }));
  }
}
