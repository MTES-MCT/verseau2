import { Body, Controller, Post, UseGuards, UsePipes } from '@nestjs/common';
import { MasaService } from './masa.service';
import { MasaWebhookPayloadDto } from './masa.model';
import { MasaApiKeyGuard } from './masaApiKey.guard';
import { MasaIpGuard } from './masaIp.guard';
import { ZodValidationPipe } from '@shared/schema/zodValidation.pipe';
import { masaPayloadSchema } from './masa.schema';

@Controller('webhook/masa')
export class MasaController {
  constructor(private readonly masaService: MasaService) {}

  @UseGuards(MasaApiKeyGuard, MasaIpGuard)
  @Post('agent-verseau')
  @UsePipes(new ZodValidationPipe(masaPayloadSchema))
  async processRetourAgentVerseau(@Body() payload: MasaWebhookPayloadDto) {
    return await this.masaService.processRetourAgentVerseau(payload);
  }
}
