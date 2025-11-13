import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LanceleauGateway } from './lanceleau.gateway';
import { ItvEntity } from './entities/itv.entity';

@Injectable()
export class LanceleauRepository implements LanceleauGateway {
  constructor(
    @InjectRepository(ItvEntity)
    private readonly itvRepository: Repository<ItvEntity>,
  ) {}

  async findItv(): Promise<ItvEntity[]> {
    return this.itvRepository.find();
  }

  async findItvById(id: string): Promise<ItvEntity | null> {
    return this.itvRepository.findOne({ where: { itvCdn: id } });
  }
}
