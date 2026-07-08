import { ErrorCode, ErrorParamsMap } from './evenement';

export function buildMessage(error: ErrorCode | undefined, params: string[]): string {
  switch (error) {
    case ErrorCode.E2_003: {
      const [cdOuvrage] = params as ErrorParamsMap[ErrorCode.E2_003];
      return `Le code ouvrage ${cdOuvrage} n'existe pas dans la base de données Roseau ! Veuillez vérifier son exactitude ou le créer dans Roseau.`;
    }
    case ErrorCode.E2_004: {
      const [moa, cdOuvrage] = params as ErrorParamsMap[ErrorCode.E2_004];
      if (cdOuvrage) {
        return `Le maître d'ouvrage ${moa} n'est pas rattaché à l'ouvrage ${cdOuvrage} dans Roseau !`;
      }
      return `Le maître d'ouvrage ${moa} n'existe pas dans la base de données Lanceleau ! Veuillez vérifier son exactitude ou le créer dans Lanceleau.`;
    }
    case ErrorCode.E2_005: {
      const [exploitant, cdOuvrage] = params as ErrorParamsMap[ErrorCode.E2_005];
      if (cdOuvrage) {
        return `L'exploitant ${exploitant} n'est pas rattaché à l'ouvrage ${cdOuvrage} dans Roseau !`;
      }
      return `L'exploitant ${exploitant} n'existe pas dans la base de données Lanceleau ! Veuillez vérifier son exactitude ou le créer dans Lanceleau.`;
    }
    case ErrorCode.E2_006: {
      const [cdSupport] = params as ErrorParamsMap[ErrorCode.E2_006];
      return `Le code support ${cdSupport} est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    }
    case ErrorCode.E2_007: {
      const [cdLieuAnalyse] = params as ErrorParamsMap[ErrorCode.E2_007];
      return `Le code lieu d'analyse ${cdLieuAnalyse} est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    }
    case ErrorCode.E2_008: {
      const [cdStatut] = params as ErrorParamsMap[ErrorCode.E2_008];
      return `Le code statut du résultat d'analyse ${cdStatut} est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    }
    case ErrorCode.E2_009: {
      const [cdQualification] = params as ErrorParamsMap[ErrorCode.E2_009];
      return `Le code qualification de l'acquisition du résultat d'analyse ${cdQualification} est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    }
    case ErrorCode.E2_010: {
      const [cdFraction] = params as ErrorParamsMap[ErrorCode.E2_010];
      return `Le code fraction analysée ${cdFraction} est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    }
    case ErrorCode.E2_011: {
      const [cdMethode] = params as ErrorParamsMap[ErrorCode.E2_011];
      return `Le code Sandre ${cdMethode} de la méthode d'analyse utilisée est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    }
    case ErrorCode.E2_012: {
      const [cdParametre] = params as ErrorParamsMap[ErrorCode.E2_012];
      return `Le code Sandre ${cdParametre} du paramètre est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    }
    case ErrorCode.E2_013: {
      const [cdUnite] = params as ErrorParamsMap[ErrorCode.E2_013];
      return `Le code Sandre ${cdUnite} de l'unité de référence est inconnu ou ne correspond pas au paramètre ! Veuillez modifier sa valeur dans le fichier.`;
    }
    case ErrorCode.E2_014: {
      const [cdIntervenant] = params as ErrorParamsMap[ErrorCode.E2_014];
      return `Le code intervenant ${cdIntervenant} n'existe pas dans la base de données Lanceleau ! Veuillez vérifier son exactitude ou le créer dans Lanceleau.`;
    }
    case ErrorCode.E2_015: {
      const [cdFinalite] = params as ErrorParamsMap[ErrorCode.E2_015];
      return `Le code Sandre ${cdFinalite} de la finalité de l'analyse est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    }
    case ErrorCode.E2_016: {
      const [cdAccreditation] = params as ErrorParamsMap[ErrorCode.E2_016];
      return `Le code Sandre ${cdAccreditation} de l'accréditation de l'analyse est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    }
    case ErrorCode.E2_017: {
      const [cdPeriode] = params as ErrorParamsMap[ErrorCode.E2_017];
      return `Le code Sandre ${cdPeriode} de la période de calcul est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    }
    case ErrorCode.E2_018: {
      const [cdTypeOuvrageAval] = params as ErrorParamsMap[ErrorCode.E2_018];
      return `Le code Sandre ${cdTypeOuvrageAval} du type d'ouvrage aval est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    }
    case ErrorCode.E2_019: {
      const [cdOuvrageAval] = params as ErrorParamsMap[ErrorCode.E2_019];
      return `Le code Sandre ${cdOuvrageAval} de l'ouvrage aval est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    }
    case ErrorCode.E2_020: {
      const [cdTypeEvenement] = params as ErrorParamsMap[ErrorCode.E2_020];
      return `Le code Sandre ${cdTypeEvenement} du type d'évènement est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    }
    case ErrorCode.E2_021: {
      const [cdRemarque] = params as ErrorParamsMap[ErrorCode.E2_021];
      return `Le code Sandre ${cdRemarque} de la remarque est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    }
    case ErrorCode.E2_022: {
      const [cdScl] = params as ErrorParamsMap[ErrorCode.E2_022];
      return `Le code du système de collecte ${cdScl} est inconnu ! Veuillez le saisir dans Roseau.`;
    }
    case ErrorCode.E2_023: {
      const [cdAgglo, cdScl] = params as ErrorParamsMap[ErrorCode.E2_023];
      return `Le code agglomération ${cdAgglo} ne peut pas recevoir de données du système de collecte ${cdScl} !`;
    }
    case ErrorCode.E2_024: {
      const [cdTypeOuvrageDepollution] = params as ErrorParamsMap[ErrorCode.E2_024];
      return `Le code Sandre ${cdTypeOuvrageDepollution} du type d'ouvrage de dépollution est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    }
    case ErrorCode.E2_025: {
      const [cdNatureSteu] = params as ErrorParamsMap[ErrorCode.E2_025];
      return `Le code Sandre ${cdNatureSteu} de la nature du système de traitement des eaux usées est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    }
    case ErrorCode.E2_026: {
      const [cdEmetteur] = params as ErrorParamsMap[ErrorCode.E2_026];
      return `Le code de l'émetteur ${cdEmetteur} des données est inconnu. Veuillez vérifier son exactitude ou le créer dans Lanceleau.`;
    }
    case ErrorCode.E2_033: {
      const [numeroPointMesure, cdOuvrage] = params as ErrorParamsMap[ErrorCode.E2_033];
      return `Le point de mesure N° ${numeroPointMesure} est inconnu pour l'ouvrage ${cdOuvrage} ! Veuillez contacter le service gestionnaire de l'ouvrage.`;
    }
    case ErrorCode.E2_034: {
      const [cdTypeDeversoir] = params as ErrorParamsMap[ErrorCode.E2_034];
      return `Le code Sandre ${cdTypeDeversoir} du type de déversoir d'orage est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    }
    case ErrorCode.E2_035: {
      const [cdConformite] = params as ErrorParamsMap[ErrorCode.E2_035];
      return `Le code de la conformité du prélèvement ${cdConformite} est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    }
    case ErrorCode.E2_036: {
      const [cdTypeAppareil] = params as ErrorParamsMap[ErrorCode.E2_036];
      return `Le code Sandre ${cdTypeAppareil} du type d'appareil de mesure est inconnu ! Veuillez modifier sa valeur dans le fichier.`;
    }
    case ErrorCode.E2_039:
      return buildErrorMessage39(params);
    case ErrorCode.E2_040:
      return buildErrorMessage40(params);
    case ErrorCode.E2_041:
      return buildErrorMessage41(params);
    case ErrorCode.E2_042:
      return buildErrorMessage42(params);
    case ErrorCode.E2_043:
      return buildErrorMessage43(params);
    case ErrorCode.E2_044:
      return buildErrorMessage44(params);
    case ErrorCode.E2_045:
      return buildErrorMessage45(params);
    case ErrorCode.E2_046:
      return buildErrorMessage46(params);
    case ErrorCode.E2_047:
      return buildErrorMessage47(params);
    case ErrorCode.E2_048:
      return buildErrorMessage48(params);
    case ErrorCode.E2_049:
      return buildErrorMessage49(params);
    case ErrorCode.E2_050:
      return buildErrorMessage50(params);
    case ErrorCode.E2_051:
      return buildErrorMessage51(params);
    case ErrorCode.E2_052:
      return buildErrorMessage52(params);
    case ErrorCode.E2_053:
      return buildErrorMessage53(params);
    case ErrorCode.E2_054:
      return buildErrorMessage54(params);
    case ErrorCode.E2_055:
      return buildErrorMessage55(params);
    case ErrorCode.E2_056:
      return buildErrorMessage56(params);
    case ErrorCode.E2_057:
      return buildErrorMessage57(params);
    case ErrorCode.E2_058:
      return buildErrorMessage58(params);
    case ErrorCode.E2_059:
      return buildErrorMessage59(params);
    case ErrorCode.E2_060:
      return buildErrorMessage60(params);
    case ErrorCode.E2_061:
      return buildErrorMessage61(params);
    case ErrorCode.E2_201:
      return buildErrorMessage201(params);
    case ErrorCode.E2_999: {
      const [message] = params as ErrorParamsMap[ErrorCode.E2_999];
      return `Une erreur technique inattendue s'est produite lors de l'exécution des contrôles du dépôt: ${message}`;
    }
    default:
      return `Erreur inconnue`;
  }
}

const buildErrorMessage39 = (params: string[]) => {
  const p = params as ErrorParamsMap[ErrorCode.E2_039];
  if (p.length === 7) {
    const [cdOuvrage, locGlobale, date, , val1, val2, ratio] = p;
    return `Le ratio DCO/DBO5 calculé (${ratio}) est en dehors de la plage de valeurs attendues (1,5 à 3,5) pour l'ouvrage ${cdOuvrage}, point de mesure ${locGlobale}, à la date du ${date} (DCO = ${val1} mg/L, DBO5 = ${val2} mg/L).`;
  }
  return p[4];
};

const buildErrorMessage40 = (params: string[]) => {
  const p = params as ErrorParamsMap[ErrorCode.E2_040];
  if (p.length === 7) {
    const [cdOuvrage, locGlobale, date, , val1, val2, ratio] = p;
    return `Le ratio MES/DBO5 calculé (${ratio}) est en dehors de la plage de valeurs attendues (0,7 à 1,5) pour l'ouvrage ${cdOuvrage}, point de mesure ${locGlobale}, à la date du ${date} (MES = ${val1} mg/L, DBO5 = ${val2} mg/L).`;
  }
  return p[4];
};

const buildErrorMessage41 = (params: string[]) => {
  const p = params as ErrorParamsMap[ErrorCode.E2_041];
  if (p.length === 5) {
    const [cdOuvrage, locGlobale, date, , val] = p;
    return `La concentration en DCO (${val} mg/L) est en dehors de la plage de valeurs attendues (300 à 1700 mg/L) pour l'ouvrage ${cdOuvrage}, point de mesure ${locGlobale}, à la date du ${date}.`;
  }
  return `Valeur DCO manquante pour l'ouvrage ${p[0]}, point ${p[1]}, date ${p[2]}`;
};

const buildErrorMessage42 = (params: string[]) => {
  const p = params as ErrorParamsMap[ErrorCode.E2_042];
  if (p.length === 5) {
    const [cdOuvrage, locGlobale, date, , val] = p;
    return `La concentration en DBO5 (${val} mg/L) est en dehors de la plage de valeurs attendues (150 à 800 mg/L) pour l'ouvrage ${cdOuvrage}, point de mesure ${locGlobale}, à la date du ${date}.`;
  }
  return `Valeur DBO5 manquante pour l'ouvrage ${p[0]}, point ${p[1]}, date ${p[2]}`;
};

const buildErrorMessage43 = (params: string[]) => {
  const p = params as ErrorParamsMap[ErrorCode.E2_043];
  if (p.length === 5) {
    const [cdOuvrage, locGlobale, date, , val] = p;
    return `La concentration en MES (${val} mg/L) est en dehors de la plage de valeurs attendues (100 à 1200 mg/L) pour l'ouvrage ${cdOuvrage}, point de mesure ${locGlobale}, à la date du ${date}.`;
  }
  return `Valeur MES manquante pour l'ouvrage ${p[0]}, point ${p[1]}, date ${p[2]}`;
};

const buildErrorMessage44 = (params: string[]) => {
  const p = params as ErrorParamsMap[ErrorCode.E2_044];
  if (p.length === 5) {
    const [cdOuvrage, locGlobale, date, , val] = p;
    return `La concentration en NTK (${val} mg/L) est en dehors de la plage de valeurs attendues (20 à 160 mg/L) pour l'ouvrage ${cdOuvrage}, point de mesure ${locGlobale}, à la date du ${date}.`;
  }
  return `Valeur NTK manquante pour l'ouvrage ${p[0]}, point ${p[1]}, date ${p[2]}`;
};

const buildErrorMessage45 = (params: string[]) => {
  const p = params as ErrorParamsMap[ErrorCode.E2_045];
  if (p.length === 5) {
    const [cdOuvrage, locGlobale, date, , val] = p;
    return `La concentration en Ptot (${val} mg/L) est en dehors de la plage de valeurs attendues (4 à 25 mg/L) pour l'ouvrage ${cdOuvrage}, point de mesure ${locGlobale}, à la date du ${date}.`;
  }
  return `Valeur Ptot manquante pour l'ouvrage ${p[0]}, point ${p[1]}, date ${p[2]}`;
};

const buildErrorMessage46 = (params: string[]) => {
  const p = params as ErrorParamsMap[ErrorCode.E2_046];
  if (p.length === 5) {
    const [cdOuvrage, locGlobale, date, , val] = p;
    return `Le pH (${val}) est en dehors de la plage de valeurs attendues (2 à 12) pour l'ouvrage ${cdOuvrage}, point de mesure ${locGlobale}, à la date du ${date}.`;
  }
  return `Valeur pH manquante pour l'ouvrage ${p[0]}, point ${p[1]}, date ${p[2]}`;
};

const buildErrorMessage47 = (params: string[]) => {
  const [cdOuvrage, locGlobale, date, , val1, val2] = params as ErrorParamsMap[ErrorCode.E2_047];
  return `Incohérence : DCO ≤ DBO5 pour l'ouvrage ${cdOuvrage}, point ${locGlobale}, date ${date} (DCO=${val1} mg/L, DBO5=${val2} mg/L)`;
};

const buildErrorMessage48 = (params: string[]) => {
  const [cdOuvrage, locGlobale, date, , val1, val2] = params as ErrorParamsMap[ErrorCode.E2_048];
  return `Incohérence : NTK ≤ N-NH4 pour l'ouvrage ${cdOuvrage}, point ${locGlobale}, date ${date} (NTK=${val1} mg/L, N-NH4=${val2} mg/L)`;
};

const buildErrorMessage49 = (params: string[]) => {
  const [cdOuvrage, locGlobale, date, , val1, val2] = params as ErrorParamsMap[ErrorCode.E2_049];
  return `Incohérence : NGL ≤ NTK pour l'ouvrage ${cdOuvrage}, point ${locGlobale}, date ${date} (NGL=${val1}, NTK=${val2})`;
};

const buildErrorMessage50 = (params: string[]) => {
  const [cdOuvrage, locGlobale, date, , val1, val2] = params as ErrorParamsMap[ErrorCode.E2_050];
  return `Incohérence : Ptot ≤ PO4 pour l'ouvrage ${cdOuvrage}, point ${locGlobale}, date ${date} (Ptot=${val1}, PO4=${val2})`;
};

const buildErrorMessage51 = (params: string[]) => {
  const p = params as ErrorParamsMap[ErrorCode.E2_051];
  if (p.length === 7) {
    const [cdOuvrage, date, seuil, valA3, testA3, valA4, testA4] = p;
    return `Volume A3/A4 incohérent vs capacité EH pour l'ouvrage ${cdOuvrage}, date ${date}. Seuil = ${seuil} m³/j. A3: ${valA3} ${testA3} seuil ; A4: ${valA4} ${testA4} seuil`;
  } else {
    return `Date ${p[0]} invalide pour le contrôle des volumes A3/A4 vs capacité EH.`;
  }
};

const buildErrorMessage52 = (params: string[]) => {
  const p = params as ErrorParamsMap[ErrorCode.E2_052];
  if (p.length === 5) {
    const [param, cdOuvrage, date, val, cma] = p;
    return `Concentration ${param} incohérente pour l'ouvrage ${cdOuvrage}, date ${date}. Valeur mesurée: ${val}, CMA année N-1: ${cma}`;
  } else {
    return `Date ${p[0]} invalide pour le contrôle des concentrations DBO5/DCO vs CMA N-1.`;
  }
};

const buildErrorMessage53 = (params: string[]) => {
  const p = params as ErrorParamsMap[ErrorCode.E2_053];
  if (p.length === 5) {
    const [cdOuvrage, date, total, maxRef, threshold] = p;
    return `Débit entrant excédentaire pour l'ouvrage ${cdOuvrage}, date ${date}. Somme mesurée: ${total} m³, max(PC95, Dref): ${maxRef} m³, Seuil (2 x max): ${threshold} m³`;
  } else {
    return `Date ${p[0]} invalide pour le contrôle des débits entrants vs seuil.`;
  }
};

const buildErrorMessage54 = (params: string[]) => {
  const [cdOuvrage, chargeMaxN, chargeMaxNMoins1, trancheLabel, variationPct] =
    params as ErrorParamsMap[ErrorCode.E2_054];
  return `La charge entrante retenue de ${chargeMaxN} EH pour l'ouvrage ${cdOuvrage} (tranche "${trancheLabel}") présente une variation de ${variationPct}% par rapport à l'année N-1 (${chargeMaxNMoins1} EH), dépassant le seuil de 20%.`;
};

const buildErrorMessage55 = (params: string[]) => {
  const [cdOuvrage, annee, productionBoue] = params as ErrorParamsMap[ErrorCode.E2_055];
  return `La production de boue pour l'ouvrage ${cdOuvrage} en ${annee} est égale à ${productionBoue}. Veuillez vérifier cette valeur.`;
};

const buildErrorMessage56 = (params: string[]) => {
  const [cdOuvrage, locGlobale, date, , val] = params as ErrorParamsMap[ErrorCode.E2_056];
  return `La température (${val} °C) est en dehors de la plage de valeurs attendues (> 0 °C et ≤ 35 °C) pour l'ouvrage ${cdOuvrage}, point de mesure ${locGlobale}, à la date du ${date}.`;
};

const buildErrorMessage57 = (params: string[]) => {
  const [cdSystemeCollecte, locGlobale, date, , val] = params as ErrorParamsMap[ErrorCode.E2_057];
  return `La pluviométrie journalière (${val} mm) est en dehors de la plage de valeurs attendues pour le système de collecte ${cdSystemeCollecte}, point de mesure ${locGlobale}, à la date du ${date}.`;
};

const buildErrorMessage58 = (params: string[]) => {
  const [cdOuvrage, locGlobale, date, , parametre, val] = params as ErrorParamsMap[ErrorCode.E2_058];
  return `Le volume/masse ${parametre} (${val}) est négatif pour l'ouvrage ${cdOuvrage}, point de mesure ${locGlobale}, à la date du ${date}.`;
};

const buildErrorMessage59 = (params: string[]) => {
  const [cdOuvrage, locGlobale, date, , parametre, val] = params as ErrorParamsMap[ErrorCode.E2_059];
  return `La concentration en ${parametre} (${val}) est négative ou nulle pour l'ouvrage ${cdOuvrage}, point de mesure ${locGlobale}, à la date du ${date}.`;
};

const buildErrorMessage60 = (params: string[]) => {
  const [cdOuvrage, chargeEH, capaciteNominale, seuilEH, date] = params as ErrorParamsMap[ErrorCode.E2_060];
  return `La charge de pollution à traiter (${chargeEH} EH) dépasse 1,5 fois la capacité nominale (${capaciteNominale} EH, seuil = ${seuilEH} EH) pour l'ouvrage ${cdOuvrage}, à la date du ${date}.`;
};

const buildErrorMessage61 = (params: string[]) => {
  const [missingPoint, datePrlvt] = params as ErrorParamsMap[ErrorCode.E2_061];
  if (missingPoint === 'A3') {
    return `Les valeurs de débit des points A3 et A4 (paramètre 1552) doivent être renseignées à la même date pour permettre le calcul du rendement. Le débit d'entrée manque pour la date ${datePrlvt}, alors que le débit de sortie pour la date ${datePrlvt} existe.`;
  }
  return `Les valeurs de débit des points A3 et A4 (paramètre 1552) doivent être renseignées à la même date pour permettre le calcul du rendement. Le débit de sortie manque pour la date ${datePrlvt}, alors que le débit d'entrée pour la date ${datePrlvt} existe.`;
};

const buildErrorMessage201 = (params: string[]) => {
  const [date] = params as ErrorParamsMap[ErrorCode.E2_201];
  return `Paramètre AOF (code 8986) absent pour la date ${date}. Ce paramètre est obligatoire pour les analyses PFAS en sortie de station (A4).`;
};
