import { EtapeMetier } from '@lib/dossier';

export const getMessageForDepotEtapeMetier = (etapeMetier?: EtapeMetier | null): string | null => {
  switch (etapeMetier) {
    case EtapeMetier.CONTROLE_METIER:
      return 'Controle métier';
    case EtapeMetier.SCENARIO_SANDRE:
      return 'Controle SANDRE';
    case EtapeMetier.FINALISATION_IMPORT:
      return 'Finalisation import';
    default:
      return null;
  }
};

export const getEtapeMetierNumber = (etapeMetier?: EtapeMetier | null): number => {
  switch (etapeMetier) {
    case EtapeMetier.CONTROLE_REFERENTIEL:
      return 1;
    case EtapeMetier.CONTROLE_METIER:
      return 2;
    case EtapeMetier.SCENARIO_SANDRE:
      return 3;
    case EtapeMetier.FINALISATION_IMPORT:
      return 4;
    default:
      return 0;
  }
};
