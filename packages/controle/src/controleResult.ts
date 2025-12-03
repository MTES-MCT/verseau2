import { ErrorCode } from './error';

export interface ControleError {
  code: ErrorCode; // e.g., "E2.003"
  message: string; // Formatted error message
  field?: string; // CdOuvrageDepollution value
}

export interface ControleIndividuel {
  success: boolean;
  name: ControleName;
  errors: ControleError[];
}

export enum ControleName {
  CTL002 = 'CTL002',
  CTL003 = 'CTL003',
  CTL004 = 'CTL004',
  CTL005 = 'CTL005',
  CTL006 = 'CTL006',
  CTL007 = 'CTL007',
  CTL008 = 'CTL008',
  CTL009 = 'CTL009',
  CTL010 = 'CTL010',
}
