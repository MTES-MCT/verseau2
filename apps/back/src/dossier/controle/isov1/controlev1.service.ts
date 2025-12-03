import { Inject, Injectable } from '@nestjs/common';
import type { FctAssainissement } from '@lib/parser';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import { ControleIndividuel, ControleError } from '@lib/controle';
import { ControleName, ErrorCode } from '@lib/controle';
import { ControleGateway } from '../controle.gateway';

@Injectable()
export class ControleV1Service {
  constructor(
    @Inject(RoseauGateway) private readonly roseauGateway: RoseauGateway,
    @Inject(ControleGateway) private readonly controleGateway: ControleGateway,
  ) {}

  async execute(depotId: string, fctAssainissement: FctAssainissement): Promise<ControleIndividuel[]> {
    const tousControles = Promise.all([this.verifySteuExists(fctAssainissement)]);
    const tousControlesResult = (await tousControles).flat();
    await this.controleGateway.createControles(
      tousControlesResult.map((controleResult) => ({
        depotId: depotId,
        name: controleResult.name,
        error: controleResult.errors[0]?.code,
      })),
    );
    return tousControlesResult;
  }

  // CTL002: Vérification que l'ouvrage de dépollution (STEU) existe bien dans la table STEU de Roseau
  async verifySteuExists(fctAssainissement: FctAssainissement): Promise<ControleIndividuel> {
    const errors: ControleError[] = [];

    for (const ouvrage of fctAssainissement.ouvrages) {
      const cdOuvrageDepollution = ouvrage.cdOuvrageDepollution;

      if (!cdOuvrageDepollution) {
        continue;
      }

      const steu = await this.roseauGateway.findSteuBySandreCda(cdOuvrageDepollution);

      if (!steu) {
        errors.push({
          code: ErrorCode.E2_003,
          message: `Le code ouvrage ${cdOuvrageDepollution} n'existe pas dans la base de données Roseau ! Veuillez vérifier son exactitude ou le créer dans Roseau.`,
          field: cdOuvrageDepollution,
        });
      }
    }

    return {
      success: errors.length === 0,
      name: ControleName.CTL002,
      errors: errors,
    };
  }
}
