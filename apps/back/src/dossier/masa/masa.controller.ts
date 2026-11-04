import { Body, Controller, HttpCode, Post, UseGuards, UsePipes } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { MasaService } from './masa.service';
import { MasaApiKeyGuard } from './masaApiKey.guard';
import { MasaIpGuard } from './masaIp.guard';
import { ZodValidationPipe } from '@shared/schema/zodValidation.pipe';
import { masaPayloadSchema, type MasaWebhookPayloadDto } from './masa.schema';
import { LoggerService } from '@shared/logger/logger.service';

@Controller('webhook/masa')
export class MasaController {
  constructor(
    private readonly masaService: MasaService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(MasaController.name);
  }

  @UseGuards(MasaApiKeyGuard, MasaIpGuard)
  @Post('agent-verseau')
  @Throttle({ default: { limit: 60, ttl: 60000, getTracker: () => 'masa-webhook' } })
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(masaPayloadSchema))
  async processRetourAgentVerseau(@Body() payload: MasaWebhookPayloadDto) {
    this.logger.log('Processing MASA webhook', { depotId: payload.verseau2DepotId, statut: payload.statut });
    return await this.masaService.processRetourAgentVerseau(payload);
  }
}
