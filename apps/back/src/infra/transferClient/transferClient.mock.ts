import { Injectable } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { TransferClient } from './transferClient';

@Injectable()
export class TransferClientMock implements TransferClient {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(TransferClientMock.name);
  }

  async send(file: Buffer, filePath: string): Promise<void> {
    this.logger.warn(`[MOCK] Uploading file: ${filePath}`);
    this.logger.warn(`[MOCK] File size: ${file.length} bytes`);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    this.logger.warn(`[MOCK] Upload complete: ${filePath}`);
  }
}
