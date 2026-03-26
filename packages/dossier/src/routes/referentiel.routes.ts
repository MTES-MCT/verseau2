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
  codeOuvrageDepollution: z.string(),
  nomOuvrageDepollution: z.string().nullable(),
  numeroPointAgenceEau: z.string().nullable(),
  numeroPointMesure: z.string().nullable(),
  libellePointMesure: z.string().nullable(),
  codeLocalisationPointMesure: z.string().nullable(),
  libelleLocalisationPointMesure: z.string().nullable(),
  categoriePointMesureScl: z.string().nullable(),
  dateDebutValiditePointMesure: z.string().nullable(),
  dateFinValiditePointMesure: z.string().nullable(),
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
