import { Controller, Get, UseGuards } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { DeposerUnFichier } from './usecase/deposerUnFichier';
import { DepotModel } from './depot.model';
import { AuthenticationGuard } from '@authentication/authentication.guard';
import { DepotService } from './depot.service';
import { UserService } from '@user/user.service';

@Controller('admin/depot')
export class DepotAdminController {
  private readonly logger = new LoggerService(DepotAdminController.name);

  constructor(
    private readonly deposerUnFichier: DeposerUnFichier,
    private readonly depotService: DepotService,
    private readonly userService: UserService,
  ) {}

  @Get()
  @UseGuards(AuthenticationGuard)
  async listAllDepots(): Promise<DepotModel[]> {
    return this.depotService.findAllByAdmin();
  }
}
