import { Controller, Get } from '@nestjs/common';
import { DepotModel } from './depot.model';
import { DepotService } from './depot.service';

@Controller('admin/depot')
export class DepotAdminController {
  constructor(private readonly depotService: DepotService) {}

  @Get()
  async listAllDepots(): Promise<DepotModel[]> {
    return this.depotService.findAllByAdmin();
  }
}
