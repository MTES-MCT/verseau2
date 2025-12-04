import { Controller, Get, UseGuards } from '@nestjs/common';
import { DepotModel } from './depot.model';
import { AuthenticationGuard } from '@authentication/authentication.guard';
import { DepotService } from './depot.service';

@Controller('admin/depot')
export class DepotAdminController {
  constructor(private readonly depotService: DepotService) {}

  @Get()
  @UseGuards(AuthenticationGuard)
  async listAllDepots(): Promise<DepotModel[]> {
    return this.depotService.findAllByAdmin();
  }
}
