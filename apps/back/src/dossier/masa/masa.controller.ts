import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { MasaService } from './masa.service';
import { MasaWebhookPayloadDto } from './masa.model';
import { MasaApiKeyGuard } from './masa-api-key.guard';
import { MasaIpGuard } from './masa-ip.guard';

@Controller('webhook/masa')
export class MasaController {
  constructor(private readonly masaService: MasaService) {}

  @UseGuards(MasaApiKeyGuard, MasaIpGuard)
  @Post('agent-verseau')
  async processRetourAgentVerseau(@Body() payload: MasaWebhookPayloadDto) {
    return await this.masaService.processRetourAgentVerseau(payload);
  }
}
