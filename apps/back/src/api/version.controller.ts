import { Controller, Get } from '@nestjs/common';
import { hostname } from 'os';

const instanceStartTime = new Date().toISOString();
const instanceId = `${hostname()}-${process.pid}`;

@Controller()
export class VersionController {
  @Get('version')
  getVersion() {
    return {
      sourceVersion: process.env.SOURCE_VERSION ?? 'unknown',
      containerVersion: process.env.CONTAINER_VERSION ?? 'unknown',
      instance: {
        id: instanceId,
        hostname: hostname(),
        pid: process.pid,
        startedAt: instanceStartTime,
      },
    };
  }
}
