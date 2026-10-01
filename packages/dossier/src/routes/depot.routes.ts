import { z } from 'zod';
import type { RouteDefinition } from './route.types';
import { DepotDtoSchema } from '../depot/depot.dto';
import { MAX_DEPOT_FILE_SIZE_BYTES } from '../depot/depotUpload';

// GET /depot - List all depots
export const listDepots = {
  method: 'GET',
  path: '/depot',
  response: z.array(DepotDtoSchema),
} as const satisfies RouteDefinition;

export const initializeDepotUpload = {
  method: 'POST',
  path: '/depot/upload/init',
  body: z.object({
    fileName: z.string().trim().min(1).max(255),
    size: z.number().int().positive().max(MAX_DEPOT_FILE_SIZE_BYTES),
    contentType: z.string().max(255),
  }),
  response: z.object({
    depotId: z.string(),
    uploadUrl: z.url(),
    headers: z.object({ 'Content-Type': z.literal('application/xml') }),
    expiresAt: z.iso.datetime(),
  }),
} as const satisfies RouteDefinition;

// Fetch before parsing the recap: deployment overrides are not known at build time.
export const getDepotXmlParseBudgets = {
  method: 'GET',
  path: '/depot/upload/xml-parse-budgets',
  response: z.object({
    maxElements: z.number().int().positive(),
    maxDepth: z.number().int().positive(),
    maxTextLength: z.number().int().positive(),
  }),
} as const satisfies RouteDefinition;

export const completeDepotUpload = {
  method: 'POST',
  path: '/depot/:id/upload/complete',
  params: z.object({ id: z.string().min(1) }),
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
