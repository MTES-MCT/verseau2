import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LanceleauGateway } from './lanceleau.gateway';
import { ItvEntity } from './entities/itv.entity';
import { SupEntity } from './entities/sup.entity';
import { FanEntity } from './entities/fan.entity';
import { ParEntity } from './entities/par.entity';
import { UrfEntity } from './entities/urf.entity';

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
}
