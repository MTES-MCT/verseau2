import { FctAssainissement } from '@lib/parser';
import { Injectable } from '@nestjs/common';
@Injectable()
export class ControleMetierService {
  constructor() {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  execute(depotId: string, xmlObj: FctAssainissement): Promise<any[]> {
    // Dummy implementation for illustration purposes
    return Promise.resolve([{ success: true }]);
  }
}
