export interface ControleError {
  code: string; // e.g., "E2.003"
  message: string; // Formatted error message
  field?: string; // CdOuvrageDepollution value
}

export interface ControleResult {
  success: boolean;
  errors: ControleError[];
}
