import { z } from 'zod';
import type { RouteDefinition } from './route.types';
import { DepotDtoSchema } from '../depot/depot.dto';

// GET /depot - List all depots
export const listDepots = {
  method: 'GET',
  path: '/depot',
  response: z.array(DepotDtoSchema),
} as const satisfies RouteDefinition;

// POST /depot/upload - Upload a depot
export const uploadDepot = {
  method: 'POST',
  path: '/depot/upload',
  response: DepotDtoSchema,
} as const satisfies RouteDefinition;

// GET /depot/droits-de-depot - Check depot rights
export const checkDroitsDeDepot = {
  method: 'GET',
  path: '/depot/droits-de-depot',
  query: z.object({
    cdOuvrageDepollution: z.string().optional(),
    cdSystemeCollecte: z.string().optional(),
    isFluxQualifie: z.enum(['true', 'false']).optional(),
  }),
  response: z.object({
    authorized: z.boolean(),
    errorCode: z.enum(['DROITS_INSUFFISANTS', 'FLUX_QUALIFIE_INTERDIT']).optional(),
  }),
} as const satisfies RouteDefinition;

// GET /depot/:id/rapport - Download rapport (binary)
export const downloadRapport = {
  method: 'GET',
  path: '/depot/:id/rapport',
  params: z.object({
    id: z.string(),
  }),
} as const satisfies RouteDefinition;

// GET /depot/:id/xml - Download XML (binary)
export const downloadXml = {
  method: 'GET',
  path: '/depot/:id/xml',
  params: z.object({
    id: z.string(),
  }),
} as const satisfies RouteDefinition;
