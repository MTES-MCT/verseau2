import { IndicateurSteuDto } from '@lib/dossier';

export interface IndicateursGateway {
  findIndicateursSteu(
    steuCodes: string[],
    page: number,
    pageSize: number,
  ): Promise<{ data: IndicateurSteuDto[]; total: number }>;
}

export const IndicateursGateway = Symbol('IndicateursGateway');
