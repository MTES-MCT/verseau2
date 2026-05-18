import type { PropertyToHeaderMapper } from '../shared/propertyToHeader.mapper';
import type { ConformiteSclDto, ConformiteSteuDto } from './conformite.dto';

export const conformiteSteuPropertyToHeaderMapper: PropertyToHeaderMapper<ConformiteSteuDto> = [
  { property: 'ouvrageDepollutionCode', header: 'Code Sandre' },
  { property: 'ouvrageDepollutionNom', header: 'Nom' },
  { property: 'trancheObligationLibelle', header: "Tranche d'obligation (EH)" },
  { property: 'capaciteNominaleEH', header: 'Capacité nominale (EH)' },
  { property: 'suiviDebutDate', header: 'Début période' },
  { property: 'suiviFinDate', header: 'Fin période' },
  { property: 'conformiteLocaleProvisoire', header: 'Conformité réglementaire' },
  { property: 'impactConformite', header: 'Synthèse des changements' },
];

export const conformiteSclPropertyToHeaderMapper: PropertyToHeaderMapper<ConformiteSclDto> = [
  { property: 'systemeCollecteCode', header: 'Code Sandre' },
  { property: 'systemeCollecteNom', header: 'Nom' },
  { property: 'trancheObligationLibelle', header: "Tranche d'obligation (EH)" },
  { property: 'typeScl', header: 'Type' },
  { property: 'suiviDebutDate', header: 'Début période' },
  { property: 'suiviFinDate', header: 'Fin période' },
  { property: 'conformiteLocaleTempsPluieProvisoire', header: 'Conformité réglementaire temps pluie' },
  { property: 'impactConformite', header: 'Synthèse des changements' },
];
