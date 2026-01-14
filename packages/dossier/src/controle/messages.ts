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
        return `Le ratio DCO/DBO5 calculé (${params[6]}) est en dehors de la plage de valeurs attendues (1,5 à 3,5) pour l'ouvrage ${params[0]}, point de mesure ${params[1]}, à la date du ${params[2]} (DCO = ${params[4]} mg/L, DBO5 = ${params[5]} mg/L).`;
      }
      return params[4]; // message d'erreur d'impossibilité
    case ErrorCode.E2_040:
      if (params.length === 7) {
        return `Le ratio MES/DBO5 calculé (${params[6]}) est en dehors de la plage de valeurs attendues (0,7 à 1,5) pour l'ouvrage ${params[0]}, point de mesure ${params[1]}, à la date du ${params[2]} (MES = ${params[4]} mg/L, DBO5 = ${params[5]} mg/L).`;
      }
      return params[4]; // message d'erreur d'impossibilité
    case ErrorCode.E2_041:
      if (params.length === 5) {
        return `La concentration en DCO (${params[4]} mg/L) est en dehors de la plage de valeurs attendues (300 à 1700 mg/L) pour l'ouvrage ${params[0]}, point de mesure ${params[1]}, à la date du ${params[2]}.`;
      }
      return `Valeur DCO manquante pour l'ouvrage ${params[0]}, point ${params[1]}, date ${params[2]}`;
    case ErrorCode.E2_042:
      if (params.length === 5) {
        return `La concentration en DBO5 (${params[4]} mg/L) est en dehors de la plage de valeurs attendues (150 à 800 mg/L) pour l'ouvrage ${params[0]}, point de mesure ${params[1]}, à la date du ${params[2]}.`;
      }
      return `Valeur DBO5 manquante pour l'ouvrage ${params[0]}, point ${params[1]}, date ${params[2]}`;
    case ErrorCode.E2_043:
      if (params.length === 5) {
        return `La concentration en MES (${params[4]} mg/L) est en dehors de la plage de valeurs attendues (100 à 1200 mg/L) pour l'ouvrage ${params[0]}, point de mesure ${params[1]}, à la date du ${params[2]}.`;
      }
      return `Valeur MES manquante pour l'ouvrage ${params[0]}, point ${params[1]}, date ${params[2]}`;
    case ErrorCode.E2_044:
      if (params.length === 5) {
        return `La concentration en NTK (${params[4]} mg/L) est en dehors de la plage de valeurs attendues (20 à 160 mg/L) pour l'ouvrage ${params[0]}, point de mesure ${params[1]}, à la date du ${params[2]}.`;
      }
      return `Valeur NTK manquante pour l'ouvrage ${params[0]}, point ${params[1]}, date ${params[2]}`;
    case ErrorCode.E2_045:
      if (params.length === 5) {
        return `La concentration en Ptot (${params[4]} mg/L) est en dehors de la plage de valeurs attendues (4 à 25 mg/L) pour l'ouvrage ${params[0]}, point de mesure ${params[1]}, à la date du ${params[2]}.`;
      }
      return `Valeur Ptot manquante pour l'ouvrage ${params[0]}, point ${params[1]}, date ${params[2]}`;
    case ErrorCode.E2_046:
      if (params.length === 5) {
        return `Le pH (${params[4]}) est en dehors de la plage de valeurs attendues (2 à 12) pour l'ouvrage ${params[0]}, point de mesure ${params[1]}, à la date du ${params[2]}.`;
      }
      return `Valeur pH manquante pour l'ouvrage ${params[0]}, point ${params[1]}, date ${params[2]}`;
    case ErrorCode.E2_047:
      return `Incohérence : DCO ≤ DBO5 pour l'ouvrage ${params[0]}, point ${params[1]}, date ${params[2]} (DCO=${params[4]} mg/L, DBO5=${params[5]} mg/L)`;
    case ErrorCode.E2_048:
      return `Incohérence : NTK ≤ N-NH4 pour l'ouvrage ${params[0]}, point ${params[1]}, date ${params[2]} (NTK=${params[4]} mg/L, N-NH4=${params[5]} mg/L)`;
    case ErrorCode.E2_049:
      return `Incohérence : NGL ≤ NTK pour l'ouvrage ${params[0]}, point ${params[1]}, date ${params[2]} (NGL=${params[4]}, NTK=${params[5]})`;
    case ErrorCode.E2_050:
      return `Incohérence : Ptot ≤ PO4 pour l'ouvrage ${params[0]}, point ${params[1]}, date ${params[2]} (Ptot=${params[4]}, PO4=${params[5]})`;
    case ErrorCode.E2_051:
      if (params.length === 7) {
        return `Volume A3/A4 incohérent vs capacité EH pour l'ouvrage ${params[0]}, date ${params[1]}. Seuil = ${params[2]} EH. A3: ${params[3]}*6 ${params[4]} seuil ; A4: ${params[5]}*6 ${params[6]} seuil`;
      } else if (params.length === 1) {
        return `Date ${params} invalide pour le contrôle des volumes A3/A4 vs capacité EH.`;
      }
    case ErrorCode.E2_052:
      if (params.length === 5) {
        return `Concentration ${params[0]} incohérente pour l'ouvrage ${params[1]}, date ${params[2]}. Valeur mesurée: ${params[3]}, CMA année N-1: ${params[4]}`;
      } else if (params.length === 1) {
        return `Date ${params} invalide pour le contrôle des concentrations DBO5/DCO vs CMA N-1.`;
      }
    case ErrorCode.E2_053:
      if (params.length === 5) {
        return `Débit entrant excédentaire pour l'ouvrage ${params[0]}, date ${params[1]}. Somme mesurée: ${params[2]} m³, max(PC95, Dref): ${params[3]} m³, Seuil (2 x max): ${params[4]} m³`;
      }
    case ErrorCode.E2_999:
      return `Une erreur technique inattendue s'est produite lors de l'exécution des contrôles du dépôt: ${params[0]}`;
    default:
      return `Erreur inconnue`;
  }
}
