import { Inject, Injectable } from '@nestjs/common';
import type { FctAssainissement } from '@lib/parser';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import { ControleResult, ControleError } from '@lib/controle/src/controleResult';
import { ErrorCode } from '@lib/controle';

@Injectable()
export class ControleV1Service {
  constructor(@Inject(RoseauGateway) private readonly roseauGateway: RoseauGateway) {}

  async execute(fctAssainissement: FctAssainissement): Promise<ControleResult> {
    console.log('fctAssainissement', fctAssainissement);
    const tousControles = Promise.all([this.verifySteuExists(fctAssainissement)]);
    const tousControlesResult = (await tousControles).flat();
    return {
      success: tousControlesResult.length === 0,
      errors: tousControlesResult,
    };
  }

  // CTL002: Vérification que l'ouvrage de dépollution (STEU) existe bien dans la table STEU de Roseau
  async verifySteuExists(fctAssainissement: FctAssainissement): Promise<ControleError[]> {
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

    return errors;
  }
}
