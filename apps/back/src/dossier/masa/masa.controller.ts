import { Body, Controller, HttpCode, Post, UseGuards, UsePipes } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { MasaService } from './masa.service';
import { MasaApiKeyGuard } from './masaApiKey.guard';
import { MasaIpGuard } from './masaIp.guard';
import { ZodValidationPipe } from '@shared/schema/zodValidation.pipe';
import { masaPayloadSchema, type MasaWebhookPayloadDto } from './masa.schema';

@Controller('webhook/masa')
@SkipThrottle()
export class MasaController {
  constructor(private readonly masaService: MasaService) {}

  @UseGuards(MasaApiKeyGuard, MasaIpGuard)
  @Post('agent-verseau')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(masaPayloadSchema))
  async processRetourAgentVerseau(@Body() payload: MasaWebhookPayloadDto) {
    return await this.masaService.processRetourAgentVerseau(payload);
  }
}
