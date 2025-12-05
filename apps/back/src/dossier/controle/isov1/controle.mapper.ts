import { ControleError, ControleIndividuel } from '@lib/dossier';
import { Injectable } from '@nestjs/common';
import { CreateControleModel } from '../controle.model';

export type ControleIndividuelWithoutSuccess = Omit<ControleIndividuel, 'success'>;
@Injectable()
export class ControleMapper {
  constructor() {}

  mapControlesIndividuelsToCreateControleModel(
    depotId: string,
    controlesIndividuels: ControleIndividuelWithoutSuccess[],
  ): CreateControleModel[] {
    return controlesIndividuels
      .map((controleIndividuel: ControleIndividuelWithoutSuccess) => {
        if (controleIndividuel.errors.length === 0) {
          return {
            depotId: depotId,
            name: controleIndividuel.name,
            success: controleIndividuel.errors.length === 0,
          };
        } else {
          const controlesWithError: CreateControleModel[] = controleIndividuel.errors
            .filter((error: ControleError) => !!error)
            .map((error: ControleError) => {
              return {
                depotId: depotId,
                name: controleIndividuel.name,
                success: controleIndividuel.errors.length === 0,
                error: error.code,
                errorParams: error.params,
              };
            });
          return controlesWithError;
        }
      })
      .flat();
  }
}
