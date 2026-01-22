import { IndicateurSteuDto } from '@lib/dossier';

export interface IndicateursGateway {
  findIndicateursSteu(steuCodes: string[]): Promise<IndicateurSteuDto[]>;
}

export const IndicateursGateway = Symbol('IndicateursGateway');
