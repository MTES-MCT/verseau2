import { Injectable } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { AgentVerseauClient } from './agentVerseauClient';

@Injectable()
export class AgentVerseauClientMock implements AgentVerseauClient {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(AgentVerseauClientMock.name);
  }

  async send(file: Buffer, filePath: string): Promise<void> {
    this.logger.warn(`[MOCK] Uploading file to Agent Verseau: ${filePath}`);
    this.logger.warn(`[MOCK] File size: ${file.length} bytes`);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    this.logger.warn(`[MOCK] Agent Verseau upload complete: ${filePath}`);
  }
}
