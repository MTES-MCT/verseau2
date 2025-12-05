import { ErrorCode } from './error';

export function buildMessage(error: ErrorCode, ...params: string[]): string {
  switch (error) {
    case ErrorCode.E2_003:
      return `Le code ouvrage ${params[0]} n'existe pas dans la base de données Roseau ! Veuillez vérifier son exactitude ou le créer dans Roseau.`;
    case ErrorCode.E2_004:
      if (params.length === 2) {
        return `Le maître d'ouvrage ${params[0]} n'est pas rattaché à l'ouvrage ${params[1]} dans Roseau !`;
      }
      return `Le maître d'ouvrage ${params[0]} n'existe pas dans la base de données Lanceleau ! Veuillez vérifier son exactitude ou le créer dans Lanceleau.`;
    case ErrorCode.E2_005:
      if (params.length === 2) {
        return `L'exploitant ${params[0]} n'est pas rattaché à l'ouvrage ${params[1]} dans Roseau !`;
      }
      return `L'exploitant ${params[0]} n'existe pas dans la base de données Lanceleau ! Veuillez vérifier son exactitude ou le créer dans Lanceleau.`;
    case ErrorCode.E2_006:
      return `Le code support ${params[0]} est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_007:
      return `Le code lieu d'analyse ${params[0]} est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_008:
      return `Le code statut du résultat d'analyse ${params[0]} est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_009:
      return `Le code qualification de l'acquisition du résultat d'analyse ${params[0]} est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_010:
      return `Le code qualification de l'acquisition du résultat d'analyse ${params[0]} est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_011:
      return `Le code Sandre ${params[0]} de la méthode d'analyse utilisée est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_012:
      return `Le code Sandre ${params[0]} du paramètre est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_013:
      return `Le code Sandre ${params[0]} de l'unité de référence est inconnu ou ne correspond pas au paramètre ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_014:
      return `Le code intervenant ${params[0]} n'existe pas dans la base de données Lanceleau ! Veuillez vérifier son exactitude ou le créer dans Lanceleau.`;
    case ErrorCode.E2_015:
      return `Le code Sandre ${params[0]} de la finalité de l'analyse est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_016:
      return `Le code Sandre ${params[0]} de l'accréditation de l'analyse est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_017:
      return `Le code Sandre ${params[0]} de la période de calcul est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_018:
      return `Le code Sandre ${params[0]} du type d'ouvrage aval est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_019:
      return `Le code Sandre ${params[0]} de l'ouvrage aval est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_020:
      return `Le code Sandre ${params[0]} du type d'évènement est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_021:
      return `Le code Sandre ${params[0]} de la remarque est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_022:
      return `Le code Sandre ${params[0]} du type de contact est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_023:
      return `Le code Sandre ${params[0]} du type de filière boues est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_024:
      return `Le code Sandre ${params[0]} de la destination des boues est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_025:
      return `Le code Sandre ${params[0]} du type de traitement des boues est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_026:
      return `Le code Sandre ${params[0]} de l'unité de la filière boues est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_027:
      return `Le code Sandre ${params[0]} du type de réseau est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_028:
      return `Le code Sandre ${params[0]} du type de système de collecte est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_029:
      return `Le code Sandre ${params[0]} du type de rejet est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_030:
      return `Le code Sandre ${params[0]} du type de milieu de rejet est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_031:
      return `Le code Sandre ${params[0]} de la zone sensible est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_032:
      return `Le code Sandre ${params[0]} de la masse d'eau de rejet est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_033:
      if (params.length === 2) {
        return `Le point de mesure N° ${params[0]} est inconnu pour l'ouvrage ${params[1]} ! Veuillez contacter le service gestionnaire de l'ouvrage.`;
      }
      return `Le code Sandre ${params[0]} du type de pompe de relève est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_034:
      return `Le code Sandre ${params[0]} du type de déversoir d'orage est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_035:
      return `Le code Sandre ${params[0]} du type de bassin d'orage est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_036:
      return `Le code Sandre ${params[0]} du type d'appareil de mesure est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    default:
      return `Erreur inconnue`;
  }
}
