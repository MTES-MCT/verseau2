import { BaseEntity } from '../baseEntity';
import { ControleName } from './controleResult';
import { ErrorCode } from './error';

export interface ControleDto extends BaseEntity {
  id: string;
  name: ControleName;
  success: boolean;
  error?: ErrorCode;
  errorParams?: string[];
}

export interface ControleSandreDto extends BaseEntity {
  id: string;
  acceptationStatus: SandreAcceptationStatus;
  isConformant: boolean;
  errorCode?: string;
  errorMessage?: string;
  errorLocation?: string;
  errorLigne?: string;
  errorColonne?: string;
  errorSeverite?: string;
}

export enum SandreAcceptationStatus {
  WAITING = 3,
  PROCESSING = 0,
  CONFORMANT = 1,
  NON_CONFORMANT = 2,
}
