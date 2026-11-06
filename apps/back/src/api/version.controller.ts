import { Controller, Get } from '@nestjs/common';
import { hostname } from 'os';
import { resolveSourceVersion } from '@shared/release';

const instanceStartTime = new Date().toISOString();

@Controller()
export class VersionController {
  @Get('version')
  getVersion() {
    return {
      sourceVersion: resolveSourceVersion(process.env) ?? 'unknown',
      containerVersion: process.env.CONTAINER_VERSION ?? 'unknown',
      environment: process.env.NODE_ENV ?? 'unknown',
      instance: {
        hostname: hostname(),
        startedAt: instanceStartTime,
      },
    };
  }
}
