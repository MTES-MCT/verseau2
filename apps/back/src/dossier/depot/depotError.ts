export enum DepotError {
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  ENQUEUE_FAILED = 'ENQUEUE_FAILED',
  DROITS_INSUFFISANTS = 'DROITS_INSUFFISANTS',
  FLUX_QUALIFIE_INTERDIT = 'FLUX_QUALIFIE_INTERDIT',
}

export class DepotRightsException extends Error {
  constructor(public readonly code: DepotError) {
    super(code);
    this.name = 'DepotRightsException';
  }
}
