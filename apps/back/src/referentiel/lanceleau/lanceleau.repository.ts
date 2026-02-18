import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LanceleauGateway } from './lanceleau.gateway';
import { ItvEntity } from './entities/itv.entity';
import { SupEntity } from './entities/sup.entity';
import { FanEntity } from './entities/fan.entity';
import { ParEntity } from './entities/par.entity';
import { UrfEntity } from './entities/urf.entity';
import { OrionCredentialsEntity } from './entities/orionCredentials.entity';
import { OrionRoleForPrincipalEntity } from './entities/orionRoleForPrincipal.entity';
import { AgEntity } from './entities/ag.entity';
import { VSteuSclItvEntity } from './entities/vSteuSclItv.entity';

@Injectable()
export class LanceleauRepository implements LanceleauGateway {
  constructor(
    @InjectRepository(ItvEntity)
    private readonly itvRepository: Repository<ItvEntity>,
    @InjectRepository(SupEntity)
    private readonly supRepository: Repository<SupEntity>,
    @InjectRepository(FanEntity)
    private readonly fanRepository: Repository<FanEntity>,
    @InjectRepository(ParEntity)
    private readonly parRepository: Repository<ParEntity>,
    @InjectRepository(UrfEntity)
    private readonly urfRepository: Repository<UrfEntity>,
    @InjectRepository(OrionCredentialsEntity)
    private readonly orionCredentialsRepository: Repository<OrionCredentialsEntity>,
    @InjectRepository(OrionRoleForPrincipalEntity)
    private readonly orionRoleForPrincipalRepository: Repository<OrionRoleForPrincipalEntity>,
    @InjectRepository(AgEntity)
    private readonly agRepository: Repository<AgEntity>,
    @InjectRepository(VSteuSclItvEntity)
    private readonly vSteuSclItvRepository: Repository<VSteuSclItvEntity>,
  ) {}

  async findItv(): Promise<ItvEntity[]> {
    return this.itvRepository.find();
  }

  async findItvById(id: number): Promise<ItvEntity | null> {
    return this.itvRepository.findOne({ where: { itvCdn: id } });
  }

  async findByItvCdn(itvCdn: number): Promise<ItvEntity | null> {
    return this.itvRepository.findOne({ where: { itvCdn } });
  }

  async findItvByRfa(itvRfa: string): Promise<ItvEntity | null> {
    return this.itvRepository.findOne({ where: { itvRfa } });
  }

  async findItvBatchByRfas(rfas: string[]): Promise<Map<string, ItvEntity>> {
    if (rfas.length === 0) return new Map();
    const rows = await this.itvRepository
      .createQueryBuilder('itv')
      .where('itv.itv_rfa IN (:...rfas)', { rfas })
      .getMany();
    return new Map(rows.map((itv) => [itv.itvRfa, itv]));
  }

  async findSupByRfa(supRfa: string): Promise<SupEntity | null> {
    return this.supRepository.findOne({ where: { supRfa } });
  }

  async findFanByRfa(fanRfa: string): Promise<FanEntity | null> {
    return this.fanRepository.findOne({ where: { fanRfa } });
  }

  async findParByRfa(parRfa: string): Promise<ParEntity | null> {
    return this.parRepository.findOne({ where: { parRfa } });
  }

  async findUrfByRfa(urfRfa: string): Promise<UrfEntity | null> {
    return this.urfRepository.findOne({ where: { urfRfa } });
  }

  async findOrionCredentialsByEmail(email: string): Promise<OrionCredentialsEntity | null> {
    return this.orionCredentialsRepository.findOne({ where: { mail: email } });
  }

  async findOrionRoleForPrincipal(prCdn: number, roleCdn: number): Promise<OrionRoleForPrincipalEntity | null> {
    return this.orionRoleForPrincipalRepository.findOne({ where: { prCdn, roleCdn } });
  }

  async findAgByPrCdn(prCdn: number): Promise<AgEntity | null> {
    return this.agRepository.findOne({ where: { prCdn } });
  }

  async findAgByEmail(email: string): Promise<AgEntity | null> {
    return this.agRepository
      .createQueryBuilder('ag')
      .innerJoin(OrionCredentialsEntity, 'oc', 'ag.pr_cdn = oc.pr_cdn')
      .where('oc.mail = :email', { email })
      .getOne();
  }

  async findAgsByItvCdn(itvCdn: number): Promise<AgEntity[]> {
    return this.agRepository.find({ where: { itvCdn } });
  }

  async findOrionCredentialsByPrCdn(prCdn: number): Promise<OrionCredentialsEntity | null> {
    return this.orionCredentialsRepository.findOne({ where: { prCdn } });
  }

  async findVSteuSclItvBySteu(steuCda: string): Promise<VSteuSclItvEntity | null> {
    return this.vSteuSclItvRepository.findOne({ where: { steuCda } });
  }

  async findVSteuSclItvByScl(sclCda: string): Promise<VSteuSclItvEntity | null> {
    return this.vSteuSclItvRepository.findOne({ where: { sclCda } });
  }

  async findVSteuSclItvByCodes(steuCodes: string[], sclCodes: string[]): Promise<VSteuSclItvEntity[]> {
    if (steuCodes.length === 0 && sclCodes.length === 0) {
      return [];
    }

    const qb = this.vSteuSclItvRepository.createQueryBuilder('v');

    if (steuCodes.length > 0 && sclCodes.length > 0) {
      qb.where('v.steuCda IN (:...steuCodes) OR v.sclCda IN (:...sclCodes)', { steuCodes, sclCodes });
    } else if (steuCodes.length > 0) {
      qb.where('v.steuCda IN (:...steuCodes)', { steuCodes });
    } else {
      qb.where('v.sclCda IN (:...sclCodes)', { sclCodes });
    }

    return qb.getMany();
  }

  async findVSteuSclItvByItvRfa(itvRfa: string): Promise<VSteuSclItvEntity[]> {
    return this.vSteuSclItvRepository
      .createQueryBuilder('v')
      .where('v.moItvRfa = :itvRfa OR v.satItvRfa = :itvRfa OR v.aeItvRfa = :itvRfa', { itvRfa })
      .getMany();
  }
}
