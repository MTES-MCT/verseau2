import { ErrorCode } from './evenement';

export function buildMessage(error: ErrorCode | undefined, params: string[]): string {
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
      return `Le code fraction analysée ${params[0]} est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
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
      return `Le code du système de collecte ${params[0]} est inconnu ! Veuillez le saisir dans Roseau.`;
    case ErrorCode.E2_023:
      return `Le code agglomération ${params[0]} ne peut pas recevoir de données du système de collecte ${params[1]} !`;
    case ErrorCode.E2_024:
      return `Le code Sandre ${params[0]} du type d'ouvrage de dépollution est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_025:
      return `Le code Sandre ${params[0]} de la nature du système de traitement des eaux usées est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_026:
      return `Le code de l'émetteur ${params[0]} des données est inconnu. Veuillez vérifier son exactitude ou le créer dans Lanceleau.`;
    case ErrorCode.E2_033:
      return `Le point de mesure N° ${params[0]} est inconnu pour l'ouvrage ${params[1]} ! Veuillez contacter le service gestionnaire de l'ouvrage.`;
    case ErrorCode.E2_034:
      return `Le code Sandre ${params[0]} du type de déversoir d'orage est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_035:
      return `Le code de la conformité du prélèvement ${params[0]} est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_036:
      return `Le code Sandre ${params[0]} du type d'appareil de mesure est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    case ErrorCode.E2_039:
      if (params.length === 7) {
        return `Ratio DCO/DBO5 hors plage (1.5-3.5) pour l'ouvrage ${params[0]}, point ${params[1]}, date ${params[2]} (DCO=${params[4]}, DBO5=${params[5]}, ratio=${params[6]})`;
      }
      return params[4]; // message d'erreur d'impossibilité
    case ErrorCode.E2_040:
      if (params.length === 7) {
        return `Ratio MES/DBO5 hors plage (0.7-1.5) pour l'ouvrage ${params[0]}, point ${params[1]}, date ${params[2]} (MES=${params[4]}, DBO5=${params[5]}, ratio=${params[6]})`;
      }
      return params[4]; // message d'erreur d'impossibilité
    case ErrorCode.E2_041:
      if (params.length === 5) {
        return `DCO hors plage (300 ; 1700) pour l'ouvrage ${params[0]}, point ${params[1]}, date ${params[2]} (DCO=${params[4]})`;
      }
      return `Valeur DCO manquante pour l'ouvrage ${params[0]}, point ${params[1]}, date ${params[2]}`;
    case ErrorCode.E2_042:
      if (params.length === 5) {
        return `DBO5 hors plage (150 ; 800) pour l'ouvrage ${params[0]}, point ${params[1]}, date ${params[2]} (DBO5=${params[4]})`;
      }
      return `Valeur DBO5 manquante pour l'ouvrage ${params[0]}, point ${params[1]}, date ${params[2]}`;
    default:
      return `Erreur inconnue`;
  }
}
