import { z } from 'zod';
import type { RouteDefinition } from './route.types';
import { OuvrageType } from './mesures.routes';

/** Type de point de mesure : réglementaire (A1–A8), logique (R1, S1–S17) ou tous. */
export const TypePointMesure = z.enum(['reglementaire', 'logique', 'tous']);
export type TypePointMesureValue = z.infer<typeof TypePointMesure>;

// GET /referentiel/codes-to-parametres - Convert numeric codes to parametre names
export const codesToParametres = {
  method: 'GET',
  path: '/referentiel/codes-to-parametres',
  query: z.object({
    codes: z.union([z.string(), z.array(z.string())]),
  }),
  response: z.object({
    parametres: z.array(z.string().nullable()),
  }),
} as const satisfies RouteDefinition;

// --- Points de mesure du référentiel ---

export const PointMesureReferentielSchema = z.object({
  ouvrageDepollutionCode: z.string(),
  ouvrageDepollutionNom: z.string().nullable(),
  pointAgenceEauNumero: z.string().nullable(),
  pointMesureNumero: z.string().nullable(),
  pointMesureLibelle: z.string().nullable(),
  pointMesureLocalisationCode: z.string().nullable(),
  pointMesureLocalisationLibelle: z.string().nullable(),
  pointMesureSclCategorie: z.string().nullable(),
  pointMesureValiditeDebutDate: z.string().nullable(),
  pointMesureValiditeFinDate: z.string().nullable(),
});

export type PointMesureReferentiel = z.infer<typeof PointMesureReferentielSchema>;

// GET /referentiel/points-mesure - List referentiel points de mesure for an ouvrage
export const listPointsMesureReferentiel = {
  method: 'GET',
  path: '/referentiel/points-mesure',
  query: z.object({
    ouvrageType: OuvrageType,
    ouvrageCode: z.string(),
    dateDebut: z.string().optional(),
    dateFin: z.string().optional(),
    typePoint: TypePointMesure.default('tous'),
  }),
  response: z.object({
    points: z.array(PointMesureReferentielSchema),
  }),
} as const satisfies RouteDefinition;
