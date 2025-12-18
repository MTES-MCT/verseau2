import { FctAssainissement } from '@lib/parser';
import { Injectable } from '@nestjs/common';
import { ControleModel } from '../controle.model';

@Injectable()
export class ControleMetierV2Service {
  constructor() {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  execute(depotId: string, xmlObj: FctAssainissement): Promise<ControleModel[]> {
    // Dummy implementation for illustration purposes
    return Promise.resolve([{ success: true } as ControleModel]);
  }
}
