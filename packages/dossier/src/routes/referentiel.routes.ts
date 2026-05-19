import { z } from 'zod';
import type { RouteDefinition } from './route.types';
import { OuvrageType } from './mesures.routes';
import { ParametreMesureSchema } from '../mesure/mesure.dto';
import { TypePointMesure } from '../shared/typePointMesure';
import { SclDetailDtoSchema, SteuDetailDtoSchema } from '../referentiel/referentiel.dto';

export { TypePointMesure, type TypePointMesureValue } from '../shared/typePointMesure';

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

export const listParametresReferentiel = {
  method: 'POST',
  path: '/referentiel/parametres',
  body: z.object({
    codes: z.array(z.string()),
  }),
  response: z.array(ParametreMesureSchema),
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
  pointMesureCategorieSystemeCollecte: z.string().nullable(),
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

export const getSteuDetail = {
  method: 'GET',
  path: '/referentiel/steu/:ouvrageDepollutionCode/detail',
  params: z.object({
    ouvrageDepollutionCode: z.string(),
  }),
  response: SteuDetailDtoSchema.nullable(),
} as const satisfies RouteDefinition;

export const getSclDetail = {
  method: 'GET',
  path: '/referentiel/scl/:systemeCollecteCode/detail',
  params: z.object({
    systemeCollecteCode: z.string(),
  }),
  response: SclDetailDtoSchema.nullable(),
} as const satisfies RouteDefinition;
