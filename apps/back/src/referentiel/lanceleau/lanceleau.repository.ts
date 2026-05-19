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
import { AgByEmail, IntervenantAuth, ItvCdnByRfa, RolePrincipal, VSteuSclItvResult } from '@masa/masa.dto';

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
    @InjectRepository(OrionRoleForPrincipalEntity)
    private readonly orionRoleForPrincipalRepository: Repository<OrionRoleForPrincipalEntity>,
    @InjectRepository(AgEntity)
    private readonly agRepository: Repository<AgEntity>,
    @InjectRepository(VSteuSclItvEntity)
    private readonly vSteuSclItvRepository: Repository<VSteuSclItvEntity>,
  ) {}

  async findIntervenantById(itvCdn: number): Promise<IntervenantAuth | null> {
    const itv = await this.itvRepository.findOne({ where: { itvCdn } });
    if (!itv) return null;
    return {
      intervenantId: itv.itvCdn,
      intervenantNom: itv.itvNomLb,
      intervenantSiret: itv.itvRfa,
    };
  }

  async findItvByRfa(itvRfa: string): Promise<ItvEntity | null> {
    return this.itvRepository.findOne({ where: { itvRfa } });
  }

  async findItvBatchByRfas(rfas: string[]): Promise<ItvCdnByRfa[]> {
    if (rfas.length === 0) return [];
    const rows = await this.itvRepository
      .createQueryBuilder('itv')
      .where('itv.itv_rfa IN (:...rfas)', { rfas })
      .getMany();
    return rows.map((itv) => ({ intervenantSiret: itv.itvRfa, intervenantId: itv.itvCdn }));
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

  async hasRole(prCdn: number, roleCdn: number): Promise<boolean> {
    const role = await this.orionRoleForPrincipalRepository.findOne({ where: { prCdn, roleCdn } });
    return !!role;
  }

  async findOrionRolesByPrCdn(prCdn: number): Promise<RolePrincipal[] | null> {
    const roles = await this.orionRoleForPrincipalRepository.find({ where: { prCdn } });
    return roles.map((r) => ({
      principalIdentifiant: r.prCdn,
      roleOrionId: r.roleCdn,
    }));
  }

  async findAgByEmail(email: string): Promise<AgByEmail | null> {
    const ag = await this.agRepository
      .createQueryBuilder('ag')
      .innerJoin(OrionCredentialsEntity, 'oc', 'ag.pr_cdn = oc.pr_cdn')
      .where('TRIM(oc.mail) = :email', { email: email.trim() })
      .getOne();

    if (!ag) return null;
    return {
      intervenantId: ag.itvCdn,
      principalIdentifiant: ag.prCdn,
    };
  }

  private mapVSteuSclItvEntityToResult(entity: VSteuSclItvEntity): VSteuSclItvResult {
    return {
      ouvrageDepollutionCode: entity.steuCda,
      systemeCollecteCode: entity.sclCda,
      maitreOuvrageSiret: entity.moItvRfa,
      prestataireAutosurveillanceSiret: entity.satItvRfa,
      agenceEauSiret: entity.aeItvRfa,
    };
  }

  async findVSteuSclItvByCodes(steuCodes: string[], sclCodes: string[]): Promise<VSteuSclItvResult[]> {
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

    const entities = await qb.getMany();
    return entities.map((e) => this.mapVSteuSclItvEntityToResult(e));
  }

  async findVSteuSclItvByItvRfa(itvRfa: string): Promise<VSteuSclItvResult[]> {
    const entities = await this.vSteuSclItvRepository
      .createQueryBuilder('v')
      .where('v.moItvRfa = :itvRfa OR v.satItvRfa = :itvRfa OR v.aeItvRfa = :itvRfa', { itvRfa })
      .getMany();
    return entities.map((e) => this.mapVSteuSclItvEntityToResult(e));
  }

  async findSiretByEmail(email: string): Promise<string | null> {
    const row = await this.itvRepository
      .createQueryBuilder('itv')
      .select('itv.itv_rfa', 'itvRfa')
      .innerJoin(AgEntity, 'ag', 'ag.itv_cdn = itv.itv_cdn')
      .innerJoin(OrionCredentialsEntity, 'oc', 'oc.pr_cdn = ag.pr_cdn')
      .where('TRIM(oc.mail) = :email', { email: email.trim() })
      .getRawOne<{ itvRfa: string | null }>();
    return row?.itvRfa ?? null;
  }
}
