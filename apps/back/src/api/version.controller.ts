import { Controller, Get } from '@nestjs/common';

@Controller()
export class VersionController {
  // TODO : supprimer ce controller une fois le déploiement vérifié
  @Get('version')
  getVersion() {
    return {
      sourceVersion: process.env.SOURCE_VERSION,
      containerVersion: process.env.CONTAINER_VERSION,
    };
  }
}
