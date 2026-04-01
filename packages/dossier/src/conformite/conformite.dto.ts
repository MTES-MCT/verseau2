import { z } from 'zod';
import { createPaginatedResponseSchema } from '../shared/pagination.schema';

export enum ConformiteProvisoire {
  Inconnue = '0',
  Conforme = '1',
  NonConforme = '2',
  SansObjet = 'X',
}

export const conformiteProvisoireLabel: Record<ConformiteProvisoire, string> = {
  [ConformiteProvisoire.Inconnue]: 'Inconnue',
  [ConformiteProvisoire.Conforme]: 'Conforme',
  [ConformiteProvisoire.NonConforme]: 'Non conforme',
  [ConformiteProvisoire.SansObjet]: 'Sans objet',
};

export const ConformiteSteuDtoSchema = z.object({
  steuCdn: z.number(),
  ouvrageDepollutionCode: z.string(),
  ouvrageDepollutionNom: z.string().nullable(),
  trancheObligationLibelle: z.string().nullable(),
  capaciteNominaleEH: z.number().nullable(),
  suiviDebutDate: z.string().nullable(),
  suiviFinDate: z.string().nullable(),
  conformiteLocaleProvisoire: z.string().nullable(),
  impactConformite: z.boolean(),
  suiviRegulierEffectue: z.boolean().nullable(),
  suiviRegulierDate: z.string().nullable(),
});

export type ConformiteSteuDto = z.infer<typeof ConformiteSteuDtoSchema>;

export const ConformiteSclDtoSchema = z.object({
  sclCdn: z.number(),
  systemeCollecteCode: z.string(),
  systemeCollecteNom: z.string().nullable(),
  trancheObligationLibelle: z.string().nullable(),
  typeScl: z.string().nullable(),
  suiviDebutDate: z.string().nullable(),
  suiviFinDate: z.string().nullable(),
  conformiteLocaleTempsPluieProvisoire: z.string().nullable(),
  impactConformite: z.boolean(),
  suiviRegulierEffectue: z.boolean().nullable(),
  suiviRegulierDate: z.string().nullable(),
});

export type ConformiteSclDto = z.infer<typeof ConformiteSclDtoSchema>;

export const ConformiteSteuDetailDtoSchema = z.object({
  conformiteLocaleParametresConformesPeriodeNb: z.number().nullable(),
  conformiteLocaleParametresConformesAnneeNb: z.number().nullable(),
  conformiteLocaleParametresNonConformesPeriodeNb: z.number().nullable(),
  conformiteLocaleParametresNonConformesAnneeNb: z.number().nullable(),
  conformiteLocaleRedhibitoiresPeriodeNb: z.number().nullable(),
  conformiteLocaleRedhibitoiresAnneeNb: z.number().nullable(),
  conformiteLocaleParametresConformesPeriodeLb: z.string().nullable(),
  conformiteLocaleParametresConformesAnneeLb: z.string().nullable(),
  conformiteLocaleParametresNonConformesPeriodeLb: z.string().nullable(),
  conformiteLocaleParametresNonConformesAnneeLb: z.string().nullable(),
  conformiteLocaleRedhibitoiresPeriodeLb: z.string().nullable(),
  conformiteLocaleRedhibitoiresAnneeLb: z.string().nullable(),
  hcnfPeriodeNb: z.number().nullable(),
  hcnfAnneeNb: z.number().nullable(),
  hctsPeriodeNb: z.number().nullable(),
  hctsAnneeNb: z.number().nullable(),
  hcnfPeriodeLb: z.string().nullable(),
  hcnfAnneeLb: z.string().nullable(),
  hctsPeriodeLb: z.string().nullable(),
  hctsAnneeLb: z.string().nullable(),
  evenementsPeriodeNb: z.number().nullable(),
  evenementsAnneeNb: z.number().nullable(),
});

export type ConformiteSteuDetailDto = z.infer<typeof ConformiteSteuDetailDtoSchema>;

export const ConformiteSclDetailDtoSchema = z.object({
  volumeDeversePeriodePc: z.number().nullable(),
  volumeDeverseAnneePc: z.number().nullable(),
  conformiteVolumePeriode: z.string().nullable(),
  conformiteVolumeAnnee: z.string().nullable(),
  fluxDeversePeriodePc: z.number().nullable(),
  fluxDeverseAnneePc: z.number().nullable(),
  conformiteFluxPeriode: z.string().nullable(),
  conformiteFluxAnnee: z.string().nullable(),
  joursDeversementPeriodeNb: z.number().nullable(),
  joursDeversementAnneeNb: z.number().nullable(),
  conformiteJoursDeversementPeriode: z.string().nullable(),
  conformiteJoursDeversementAnnee: z.string().nullable(),
});

export type ConformiteSclDetailDto = z.infer<typeof ConformiteSclDetailDtoSchema>;

export const PaginatedConformiteSteuResponseSchema = createPaginatedResponseSchema(ConformiteSteuDtoSchema);
export type PaginatedConformiteSteuResponse = z.infer<typeof PaginatedConformiteSteuResponseSchema>;

export const PaginatedConformiteSclResponseSchema = createPaginatedResponseSchema(ConformiteSclDtoSchema);
export type PaginatedConformiteSclResponse = z.infer<typeof PaginatedConformiteSclResponseSchema>;
