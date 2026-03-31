import { z } from 'zod';
import { createPaginatedResponseSchema } from '../shared/pagination.schema';

const nullableString = z.string().nullable();
const nullableNumber = z.number().nullable();

export const ConformiteSteuRowDtoSchema = z.object({
  ouvrageDepollutionCode: z.string(),
  ouvrageDepollutionNom: nullableString,
  trancheObligationLibelle: nullableString,
  capaciteNominaleEH: nullableNumber,
  suiviDebutDate: nullableString,
  suiviFinDate: nullableString,
  conformiteNationaleProvisoire: nullableString,
  conformiteLocaleProvisoire: nullableString,
  impactConformite: z.boolean(),
  suiviRegulierEffectue: z.boolean().nullable(),
  suiviRegulierDate: nullableString,
});

export type ConformiteSteuRowDto = z.infer<typeof ConformiteSteuRowDtoSchema>;

export const ConformiteSclRowDtoSchema = z.object({
  systemeCollecteCode: z.string(),
  systemeCollecteNom: nullableString,
  trancheObligationLibelle: nullableString,
  typeScl: nullableString,
  suiviDebutDate: nullableString,
  suiviFinDate: nullableString,
  conformiteLocaleTempsPluieProvisoire: nullableString,
  conformiteNationaleTempsPluieProvisoire: nullableString,
  impactConformite: z.boolean(),
  suiviRegulierEffectue: z.boolean().nullable(),
  suiviRegulierDate: nullableString,
});

export type ConformiteSclRowDto = z.infer<typeof ConformiteSclRowDtoSchema>;

export const PaginatedConformiteSteuResponseSchema = createPaginatedResponseSchema(ConformiteSteuRowDtoSchema);
export type PaginatedConformiteSteuResponse = z.infer<typeof PaginatedConformiteSteuResponseSchema>;

export const PaginatedConformiteSclResponseSchema = createPaginatedResponseSchema(ConformiteSclRowDtoSchema);
export type PaginatedConformiteSclResponse = z.infer<typeof PaginatedConformiteSclResponseSchema>;

export const ConformiteSteuDetailDtoSchema = z.object({
  conformiteLocaleParametresConformesPeriodeNb: nullableNumber,
  conformiteLocaleParametresConformesAnneeNb: nullableNumber,
  nonConformiteLocaleParametresConformesPeriodeNb: nullableNumber,
  nonConformiteLocaleParametresConformesAnneeNb: nullableNumber,
  redhLocaleParametresConformesPeriodeNb: nullableNumber,
  redhLocaleParametresConformesAnneeNb: nullableNumber,
  conformiteLocaleParametresConformesPeriodeLibelle: nullableString,
  conformiteLocaleParametresConformesAnneeLibelle: nullableString,
  nonConformiteLocaleParametresConformesPeriodeLibelle: nullableString,
  nonConformiteLocaleParametresConformesAnneeLibelle: nullableString,
  redhLocaleParametresConformesPeriodeLibelle: nullableString,
  redhLocaleParametresConformesAnneeLibelle: nullableString,
  conformiteNationaleParametresConformesPeriodeNb: nullableNumber,
  conformiteNationaleParametresConformesAnneeNb: nullableNumber,
  nonConformiteNationaleParametresConformesPeriodeNb: nullableNumber,
  nonConformiteNationaleParametresConformesAnneeNb: nullableNumber,
  redhNationaleParametresConformesPeriodeNb: nullableNumber,
  redhNationaleParametresConformesAnneeNb: nullableNumber,
  conformiteNationaleParametresConformesPeriodeLibelle: nullableString,
  conformiteNationaleParametresConformesAnneeLibelle: nullableString,
  nonConformiteNationaleParametresConformesPeriodeLibelle: nullableString,
  nonConformiteNationaleParametresConformesAnneeLibelle: nullableString,
  redhNationaleParametresConformesPeriodeLibelle: nullableString,
  redhNationaleParametresConformesAnneeLibelle: nullableString,
  hcnfPeriodeNb: nullableNumber,
  hcnfAnneeNb: nullableNumber,
  hctsPeriodeNb: nullableNumber,
  hctsAnneeNb: nullableNumber,
  hcnfPeriodeLibelle: nullableString,
  hcnfAnneeLibelle: nullableString,
  hctsPeriodeLibelle: nullableString,
  hctsAnneeLibelle: nullableString,
  evtPeriodeNb: nullableNumber,
  evtAnneeNb: nullableNumber,
});
export type ConformiteSteuDetailDto = z.infer<typeof ConformiteSteuDetailDtoSchema>;

export const ConformiteSclDetailDtoSchema = z.object({
  volumeDeversePeriodePc: nullableNumber,
  volumeDeverseAnneePc: nullableNumber,
  conformiteVolumePeriode: nullableNumber,
  conformiteVolumeAnnee: nullableNumber,
  fluxDeversePeriodePc: nullableNumber,
  fluxDeverseAnneePc: nullableNumber,
  conformiteFluxPeriode: nullableNumber,
  conformiteFluxAnnee: nullableNumber,
  joursDeversementPeriodeNb: nullableNumber,
  joursDeversementAnneeNb: nullableNumber,
  conformiteJoursDeversementPeriode: nullableNumber,
  conformiteJoursDeversementAnnee: nullableNumber,
});
export type ConformiteSclDetailDto = z.infer<typeof ConformiteSclDetailDtoSchema>;
