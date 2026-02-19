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
import { CmaBySandreCdaAndParam, MaxDebitBySandreCda, ChargeEntranteAndTrancheBySandreCda } from '@masa/masa.dto';
import { SteuCdnBySandreCda } from '@masa/masa.dto';

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
  ) {}

  async findAga(): Promise<AgaEntity[]> {
    return this.agaRepository.find();
  }

  async findScl(): Promise<SclEntity[]> {
    return this.sclRepository.find();
  }

  async findSteu(): Promise<SteuEntity[]> {
    return this.steuRepository.find();
  }

  async findAgaById(id: number): Promise<AgaEntity | null> {
    return this.agaRepository.findOne({ where: { agaCdn: id } });
  }

  async findSclById(id: number): Promise<SclEntity | null> {
    return this.sclRepository.findOne({ where: { sclCdn: id } });
  }

  async findSclBySandreCda(sandreCda: string): Promise<SclEntity | null> {
    return this.sclRepository.findOne({ where: { sclSandreCda: sandreCda } });
  }

  async findSteuById(id: number): Promise<SteuEntity | null> {
    return this.steuRepository.findOne({ where: { steuCdn: id } });
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

  async findCxnAdmByExpSteuAndItv(steuCdn: number, itvCdn: number): Promise<CxnadmEntity | null> {
    return this.cxnadmRepository.findOne({ where: { expSteuCdn: steuCdn, steuItvCdn: itvCdn } });
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

  async findPmoBySteuAndNumero(steuCdn: number, pmoNo: string): Promise<PmoEntity | null> {
    return this.pmoRepository.findOne({ where: { steuCdn: steuCdn, pmoNo: pmoNo } });
  }

  async findPmoBySteuNumeroAndLocPoint(
    cdOuvrageDepollution: string,
    numeroPointMesure: string,
    codeLocPoint: string,
  ): Promise<PmoEntity | null> {
    const query = this.pmoRepository
      .createQueryBuilder('pmo')
      .innerJoin(SteuEntity, 'steu', 'steu.steu_cdn = pmo.steu_cdn')
      .innerJoin(TlrefEntity, 't16', 't16.tlref_cdn = pmo.tlref_16_cdn')
      .where('steu.steu_sandre_cda = :cdOuvrageDepollution', { cdOuvrageDepollution })
      .andWhere('pmo.pmo_no = :numeroPointMesure', { numeroPointMesure }) // ex: 14 ou 0229000001
      .andWhere('t16.tlref_elt_cda = :codeLocPoint', { codeLocPoint }); // ex: S14 ou S15

    return query.getOne();
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

  async findCxnTechBySclAndAga(sclCdn: number, agaZgcCdn: number): Promise<CxntechEntity | null> {
    return this.cxntechRepository.findOne({ where: { avalSclCdn: sclCdn, amontZgcCdn: agaZgcCdn } });
  }

  async isSystemeCollecteLinkedToAgglomeration(
    cdSystemeCollecte: string,
    cdAgglomerationAssainissement: string,
  ): Promise<boolean> {
    const row = await this.sclRepository
      .createQueryBuilder('scl')
      .select('scl.scl_cdn', 'scl_cdn')
      .innerJoin(AgaEntity, 'aga', 'aga.aga_sandre_cda = :cdAgglo', {
        cdAgglo: cdAgglomerationAssainissement,
      })
      .innerJoin(
        CxntechEntity,
        'cxntech',
        'cxntech.aval_scl_cdn = scl.scl_cdn AND cxntech.amont_zgc_cdn = aga.zgc_cdn AND cxntech.cxntech_retrait_dt IS NULL',
      )
      .where('scl.scl_sandre_cda = :cdScl', { cdScl: cdSystemeCollecte })
      .getRawOne<{ scl_cdn: string }>();

    return Boolean(row);
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

  async findConcentrationMoyenneAnnuelle(
    steuSandreCda: string,
    year: number,
    parametreCodes: string[],
  ): Promise<Map<string, number>> {
    const rows = await this.resaRepository
      .createQueryBuilder('r')
      .select('r.par_rfa', 'par_rfa')
      .addSelect('r.resa_cma_val', 'resa_cma_val')
      .innerJoin(SteuEntity, 's', 's.steu_cdn = r.steu_cdn')
      .where('s.steu_sandre_cda = :steuSandreCda', { steuSandreCda })
      .andWhere('r.resa_an = :year', { year })
      .andWhere('r.par_rfa IN (:...parametreCodes)', { parametreCodes })
      .getRawMany<{ par_rfa: string; resa_cma_val: string }>();

    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.par_rfa, parseFloat(row.resa_cma_val));
    }
    return map;
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

  async findMaxDebitReference(steuSandreCda: string): Promise<number | null> {
    const result = await this.stchanRepository
      .createQueryBuilder('t')
      .select('t.stchan_pc95_val', 'pc95')
      .addSelect('c.cpy_ref_debit_mt', 'dref')
      .innerJoin(SteuEntity, 's', 's.steu_cdn = t.steu_cdn')
      .innerJoin(CpyEntity, 'c', 'c.steu_cdn = s.steu_cdn')
      .where('s.steu_sandre_cda = :steuSandreCda', { steuSandreCda })
      .andWhere('t.stchan_an = s.steu_encours_an')
      .andWhere('c.cpy_an = s.steu_encours_an')
      .getRawOne<{ pc95: number | null; dref: number | null }>();

    if (!result) return null;

    const pc95 = result.pc95 ? parseFloat(result.pc95.toString()) : 0;
    const dref = result.dref ? parseFloat(result.dref.toString()) : 0;

    return Math.max(pc95, dref);
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

  async findChargeEntranteMaxAndTrancheForSteu(
    steuSandreCda: string,
    year: number,
  ): Promise<ChargeEntranteAndTrancheBySandreCda | null> {
    const result = await this.stchanRepository
      .createQueryBuilder('c')
      .select('c.stchan_r_eh_max_chg_val', 'charge_max')
      .addSelect('t.tltobl_lb', 'tranche_label')
      .addSelect('t.tltobl_rfa', 'tranche_rfa')
      .innerJoin(SteuEntity, 's', 's.steu_cdn = c.steu_cdn')
      .innerJoin(AgaEntity, 'a', 'a.zgc_cdn = s.zgc_cdn')
      .innerJoin(TltoblEntity, 't', 't.tltobl_rfa = a.tltobl_rfa')
      .where('s.steu_sandre_cda = :steuSandreCda', { steuSandreCda })
      .andWhere('c.stchan_an = :year', { year })
      .getRawOne<{ charge_max: number | null; tranche_label: string | null; tranche_rfa: string | null }>();

    if (!result || result.charge_max === null || result.tranche_label === null || result.tranche_rfa === null) {
      return null;
    }

    return {
      sandreCda: steuSandreCda,
      chargeMax: parseFloat(result.charge_max.toString()),
      trancheLabel: result.tranche_label,
      trancheRfa: result.tranche_rfa,
    };
  }

  async findChargeEntranteMaxAndTrancheBatch(
    steuSandreCdas: string[],
    year: number,
  ): Promise<ChargeEntranteAndTrancheBySandreCda[]> {
    if (steuSandreCdas.length === 0) {
      return [];
    }

    const rows = await this.stchanRepository
      .createQueryBuilder('c')
      .select('s.steu_sandre_cda', 'steu_sandre_cda')
      .addSelect('c.stchan_r_eh_max_chg_val', 'charge_max')
      .addSelect('t.tltobl_lb', 'tranche_label')
      .addSelect('t.tltobl_rfa', 'tranche_rfa')
      .innerJoin(SteuEntity, 's', 's.steu_cdn = c.steu_cdn')
      .innerJoin(AgaEntity, 'a', 'a.zgc_cdn = s.zgc_cdn')
      .innerJoin(TltoblEntity, 't', 't.tltobl_rfa = a.tltobl_rfa')
      .where('s.steu_sandre_cda IN (:...steuSandreCdas)', { steuSandreCdas })
      .andWhere('c.stchan_an = :year', { year })
      .getRawMany<{
        steu_sandre_cda: string;
        charge_max: number | null;
        tranche_label: string | null;
        tranche_rfa: string | null;
      }>();

    return rows
      .filter((r) => r.charge_max !== null && r.tranche_label !== null && r.tranche_rfa !== null)
      .map((r) => ({
        sandreCda: r.steu_sandre_cda.trim(),
        chargeMax: parseFloat(r.charge_max!.toString()),
        trancheLabel: r.tranche_label!.trim(),
        trancheRfa: r.tranche_rfa!.trim(),
      }));
  }
}
