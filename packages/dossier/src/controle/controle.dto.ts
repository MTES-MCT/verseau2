import { BaseEntity } from '../baseEntity';
import { ControleName } from './controleResult';
import { ErrorCode, EvenementType } from './evenement';

export interface ControleDto extends BaseEntity {
  id: string;
  name: ControleName;
  success: boolean;
  error?: ErrorCode;
  errorParams?: string[];
  evenementType?: EvenementType | undefined;
}

export interface SandreValidationErrorDto {
  code: string;
  message: string;
  location?: string;
  ligne?: string;
  colonne?: string;
  severite?: string;
}

export interface ControleSandreDto extends BaseEntity {
  id: string;
  acceptationStatus: SandreAcceptationStatus;
  isConformant: boolean;
  errors?: SandreValidationErrorDto[];
}

export enum SandreAcceptationStatus {
  WAITING = 3,
  PROCESSING = 0,
  CONFORMANT = 1,
  NON_CONFORMANT = 2,
}
