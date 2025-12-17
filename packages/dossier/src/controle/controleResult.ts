import { ErrorCode, EvenementType } from './evenement';

export interface ControleError {
  code: ErrorCode; // e.g., "E2.003"
  params: string[]; // CdOuvrageDepollution value
  evenementType?: EvenementType;
}

export interface ControleErrorDto extends ControleError {
  message: string;
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
  CTL011 = 'CTL011',
  CTL012 = 'CTL012',
  CTL013 = 'CTL013',
  CTL014 = 'CTL014',
  CTL015 = 'CTL015',
  CTL016 = 'CTL016',
  CTL017 = 'CTL017',
  CTL018 = 'CTL018',
  CTL019 = 'CTL019',
  CTL020 = 'CTL020',
  CTL021 = 'CTL021',
  CTL022 = 'CTL022',
  CTL023 = 'CTL023',
  CTL024 = 'CTL024',
  CTL025 = 'CTL025',
  CTL026 = 'CTL026',
  CTL034 = 'CTL034',
  CTL035 = 'CTL035',
  CTL036 = 'CTL036',
}
