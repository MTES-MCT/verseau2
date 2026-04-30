import { z } from 'zod';

/** Type de point de mesure : réglementaire (A1–A8, M1-M3), logique (R1, S1–S17) ou tous. */
export const TypePointMesure = z.enum(['reglementaire', 'logique', 'tous']);
export type TypePointMesureValue = z.infer<typeof TypePointMesure>;
