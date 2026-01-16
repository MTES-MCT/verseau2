import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindOptionsWhere } from 'typeorm';
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

  async findItvById(id: string): Promise<ItvEntity | null> {
    return this.itvRepository.findOne({ where: { itvCdn: id } });
  }

  async findByItvCdn(itvCdn: string): Promise<ItvEntity | null> {
    return this.itvRepository.findOne({ where: { itvCdn } });
  }

  async findItvByRfa(itvRfa: string): Promise<ItvEntity | null> {
    return this.itvRepository.findOne({ where: { itvRfa } });
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

  async findOrionRoleForPrincipal(prCdn: string, roleCdn: number): Promise<OrionRoleForPrincipalEntity | null> {
    return this.orionRoleForPrincipalRepository.findOne({ where: { prCdn, roleCdn } });
  }

  async findAgByPrCdn(prCdn: string): Promise<AgEntity | null> {
    return this.agRepository.findOne({ where: { prCdn } });
  }

  async findVSteuSclItvBySteu(steuCda: string): Promise<VSteuSclItvEntity | null> {
    return this.vSteuSclItvRepository.findOne({ where: { steuCda } });
  }

  async findVSteuSclItvByScl(sclCda: string): Promise<VSteuSclItvEntity | null> {
    return this.vSteuSclItvRepository.findOne({ where: { sclCda } });
  }

  async findVSteuSclItvByCodes(steuCodes: string[], sclCodes: string[]): Promise<VSteuSclItvEntity[]> {
    const where: FindOptionsWhere<VSteuSclItvEntity>[] = [];

    if (steuCodes.length > 0) {
      where.push({ steuCda: In(steuCodes) });
    }

    if (sclCodes.length > 0) {
      where.push({ sclCda: In(sclCodes) });
    }

    if (where.length === 0) {
      return [];
    }

    return this.vSteuSclItvRepository.find({ where });
  }
}
