import { z } from 'zod';
import { BaseEntitySchema } from '../baseEntity';
import { ControleName } from './controleResult';
import { ErrorCode, EvenementType } from './evenement';

export const ControleDtoSchema = BaseEntitySchema.extend({
  id: z.string(),
  name: z.nativeEnum(ControleName),
  success: z.boolean(),
  error: z.nativeEnum(ErrorCode).optional(),
  errorParams: z.array(z.string()).optional(),
  evenementType: z.nativeEnum(EvenementType).optional(),
});

export type ControleDto = z.infer<typeof ControleDtoSchema>;

export const SandreValidationErrorDtoSchema = z.object({
  code: z.string(),
  message: z.string(),
  location: z.string().optional(),
  ligne: z.string().optional(),
  colonne: z.string().optional(),
  severite: z.string().optional(),
});

export type SandreValidationErrorDto = z.infer<typeof SandreValidationErrorDtoSchema>;

export enum SandreAcceptationStatus {
  WAITING = 3,
  PROCESSING = 0,
  CONFORMANT = 1,
  NON_CONFORMANT = 2,
}

export const ControleSandreDtoSchema = BaseEntitySchema.extend({
  id: z.string(),
  acceptationStatus: z.nativeEnum(SandreAcceptationStatus),
  isConformant: z.boolean(),
  errors: z.array(SandreValidationErrorDtoSchema).optional(),
});

export type ControleSandreDto = z.infer<typeof ControleSandreDtoSchema>;
