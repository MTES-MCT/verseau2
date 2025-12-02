export interface ReferentielGateway {
  findItvBySteuAndIntervenant(cdOuvrageDepollution: string, cdIntervenant: string): Promise<string[]>;
}

export const ReferentielGateway = Symbol('ReferentielGateway');
