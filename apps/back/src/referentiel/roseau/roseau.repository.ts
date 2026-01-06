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

  async findCxnAdmBySteuAndItv(steuCdn: string, itvCdn: string): Promise<CxnadmEntity | null> {
    return this.cxnadmRepository.findOne({ where: { moSteuCdn: steuCdn, steuItvCdn: parseInt(itvCdn, 10) } });
  }

  async findCxnAdmByExpSteuAndItv(steuCdn: string, itvCdn: string): Promise<CxnadmEntity | null> {
    return this.cxnadmRepository.findOne({ where: { expSteuCdn: steuCdn, steuItvCdn: parseInt(itvCdn, 10) } });
  }

  async findPmoBySteuAndNumero(steuCdn: string, pmoNo: number): Promise<PmoEntity | null> {
    return this.pmoRepository.findOne({ where: { steuCdn: steuCdn, pmoNo: pmoNo } });
  }

  async findPmoBySteuNumeroAndLocPoint(
    cdOuvrageDepollution: string,
    numeroPointMesure: number,
    codeLocPoint: string,
  ): Promise<PmoEntity | null> {
    const query = this.pmoRepository
      .createQueryBuilder('pmo')
      .innerJoin(SteuEntity, 'steu', 'steu.steu_cdn = pmo.steu_cdn')
      .innerJoin(TlrefEntity, 't16', 't16.tlref_cdn = pmo.tlref_16_cdn')
      .where('steu.steu_sandre_cda = :cdOuvrageDepollution', { cdOuvrageDepollution })
      .andWhere('pmo.pmo_no = :numeroPointMesure', { numeroPointMesure })
      .andWhere('t16.tlref_elt_cda = :codeLocPoint', { codeLocPoint });

    const row = await query.getOne();

    // TODO : suppprimer ce log après debug
    // console.log('!!!!!!!!!!PMO Query:', query);

    return row;
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
}
