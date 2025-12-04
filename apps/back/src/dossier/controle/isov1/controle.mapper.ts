import { ControleError, ControleIndividuel } from '@lib/controle';
import { Injectable } from '@nestjs/common';
import { CreateControleModel } from '../controle.model';

@Injectable()
export class ControleMapper {
  constructor() {}

  mapControlesIndividuelsToCreateControleModel(
    depotId: string,
    controlesIndividuels: ControleIndividuel[],
  ): CreateControleModel[] {
    return controlesIndividuels
      .map((controleIndividuel: ControleIndividuel) => {
        const controlesWithoutError: CreateControleModel = {
          depotId: depotId,
          name: controleIndividuel.name,
          success: controleIndividuel.success,
        };
        const controlesWithError: CreateControleModel[] = controleIndividuel.errors.map((error: ControleError) => {
          return {
            depotId: depotId,
            name: controleIndividuel.name,
            success: controleIndividuel.success,
            error: error.code,
            errorParams: error.params,
          };
        });
        const controles = [controlesWithoutError, ...controlesWithError];
        return controles;
      })
      .flat();
  }
}
