import type { SandreAccuseReception, SandreErreur, SandreNestedErreur, SandreValidationError } from './sandre';

function isNestedErreur(item: SandreErreur | SandreNestedErreur): item is SandreNestedErreur {
  return 'Erreur' in item;
}

function mapNestedErreur(item: SandreNestedErreur, globalSeverity?: string): SandreValidationError {
  return {
    code: item.Erreur.CdErreur,
    message: item.Erreur.DescriptifErreur,
    location: item.Erreur.LocationErreur,
    ligne: item.Erreur.LigneErreur,
    colonne: item.Erreur.ColonneErreur,
    severite: item.Erreur['@attributes']?.SeveriteErreur ?? item['Erreur@attributes']?.SeveriteErreur ?? globalSeverity,
  };
}

function mapSimpleErreur(item: SandreErreur, globalSeverity?: string): SandreValidationError {
  return {
    code: item.CdErreur,
    message: item.DescriptifErreur,
    location: item.LocationErreur,
    ligne: item.LigneErreur,
    colonne: item.ColonneErreur,
    severite: item['@attributes']?.SeveriteErreur ?? globalSeverity,
  };
}

export function mapSandreErrors(accuseReception: SandreAccuseReception): SandreValidationError[] {
  const rawErreur = accuseReception.Erreur;
  const globalSeverity = accuseReception['Erreur@attributes']?.SeveriteErreur;

  if (!rawErreur) {
    return [];
  }

  if (Array.isArray(rawErreur)) {
    return rawErreur.map((item) =>
      isNestedErreur(item) ? mapNestedErreur(item, globalSeverity) : mapSimpleErreur(item, globalSeverity),
    );
  }

  return [mapSimpleErreur(rawErreur, globalSeverity)];
}
