import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateDepotModel, DepotModel } from './depot.model';
import { DepotGateway } from './depot.gateway';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';

@Injectable()
export class DepotService {
  constructor(
    @Inject(DepotGateway) private readonly depotGateway: DepotGateway,
    @Inject(RoseauGateway) private readonly roseauGateway: RoseauGateway,
  ) {}

  async create(depotData: CreateDepotModel): Promise<DepotModel> {
    const newDepot = await this.depotGateway.createDepot({
      ...depotData,
    });

    return newDepot;
  }

  async findById(id: string): Promise<DepotModel> {
    const depot = await this.depotGateway.findDepotById(id);
    if (!depot) {
      throw new NotFoundException(`Depot with id ${id} not found`);
    }
    return depot;
  }

  async findAllByAdmin(): Promise<DepotModel[]> {
    return await this.depotGateway.findAllDepotsByAdmin();
  }

  async findByUserId(userId: string): Promise<DepotModel[]> {
    return await this.depotGateway.findByUserId(userId);
  }

  async update(id: string, updateData: Partial<Omit<DepotModel, 'id' | 'createdAt'>>): Promise<DepotModel> {
    const depot = await this.depotGateway.findDepotById(id);
    if (!depot) {
      throw new NotFoundException(`Depot with id ${id} not found`);
    }
    const updatedDepot = await this.depotGateway.updateDepot(id, updateData);
    if (!updatedDepot) {
      throw new NotFoundException(`Depot with id ${id} not found`);
    }
    return updatedDepot;
  }

  async checkDroitsDeDepot(cdOuvrage: string, itvCdn: string): Promise<boolean> {
    const steu = await this.roseauGateway.findSteuBySandreCda(cdOuvrage);
    if (!steu) {
      return false;
    }
    // TODO : Vérifier si cette requête est la bonne pour les droits de dépo
    const cxnAdm = await this.roseauGateway.findCxnAdmBySteuAndItv(steu.steuCdn, itvCdn);
    return !!cxnAdm;
  }
}
