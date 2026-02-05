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

  async findAgaById(id: string): Promise<AgaEntity | null> {
    return this.agaRepository.findOne({ where: { agaCdn: id } });
  }

  async findSclById(id: string): Promise<SclEntity | null> {
    return this.sclRepository.findOne({ where: { sclCdn: id } });
  }

  async findSclBySandreCda(sandreCda: string): Promise<SclEntity | null> {
    return this.sclRepository.findOne({ where: { sclSandreCda: sandreCda } });
  }

  async findSteuById(id: string): Promise<SteuEntity | null> {
    return this.steuRepository.findOne({ where: { steuCdn: id } });
  }

  async findSteuBySandreCda(sandreCda: string): Promise<SteuEntity | null> {
    return this.steuRepository.findOne({ where: { steuSandreCda: sandreCda } });
  }

  async findCxnAdmBySteuAndItv(steuCdn: string, itvCdn: number): Promise<CxnadmEntity | null> {
    return this.cxnadmRepository.findOne({ where: { moSteuCdn: steuCdn, steuItvCdn: itvCdn } });
  }

  async findCxnAdmByExpSteuAndItv(steuCdn: string, itvCdn: number): Promise<CxnadmEntity | null> {
    return this.cxnadmRepository.findOne({ where: { expSteuCdn: steuCdn, steuItvCdn: itvCdn } });
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

  async findTlrefByRfaAndCda(trlRfa: string, tlrefEltCda: string): Promise<TlrefEntity | null> {
    return this.tlrefRepository.findOne({ where: { trlRfa: trlRfa, tlrefEltCda: tlrefEltCda } });
  }

  async findCxnTechBySclAndAga(sclCdn: string, agaZgcCdn: string): Promise<CxntechEntity | null> {
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
}
