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

  async findSteuById(id: string): Promise<SteuEntity | null> {
    return this.steuRepository.findOne({ where: { steuCdn: id } });
  }

  async findSteuBySandreCda(sandreCda: string): Promise<SteuEntity | null> {
    return this.steuRepository.findOne({ where: { steuSandreCda: sandreCda } });
  }

  async findCxnAdmBySteuAndItv(steuCdn: string, itvCdn: string): Promise<CxnadmEntity | null> {
    return this.cxnadmRepository.findOne({ where: { moSteuCdn: steuCdn, steuItvCdn: itvCdn } });
  }

  async findCxnAdmByExpSteuAndItv(steuCdn: string, itvCdn: string): Promise<CxnadmEntity | null> {
    return this.cxnadmRepository.findOne({ where: { expSteuCdn: steuCdn, steuItvCdn: itvCdn } });
  }

  async findPmoBySteuAndNumero(steuCdn: string, pmoNo: number): Promise<PmoEntity | null> {
    return this.pmoRepository.findOne({ where: { steuCdn: steuCdn, pmoNo: pmoNo } });
  }

  async findTlrefByRfaAndCda(trlRfa: string, tlrefEltCda: string): Promise<TlrefEntity | null> {
    return this.tlrefRepository.findOne({ where: { trlRfa: trlRfa, tlrefEltCda: tlrefEltCda } });
  }

  async findCxnTechBySclAndAga(sclCdn: string, agaZgcCdn: string): Promise<CxntechEntity | null> {
    return this.cxntechRepository.findOne({ where: { avalSclCdn: sclCdn, amontZgcCdn: agaZgcCdn } });
  }
}
