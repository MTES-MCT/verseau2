export const AppRoutes = {
  HOME: '/',
  CALLBACK: '/callback',
  DASHBOARD: '/dashboard',
  CONTROLE: '/controle/:depotId',
  DEPOT_UPLOAD: '/depot/upload',
  DEPOT_UPLOAD_RECAP: '/depot/upload/recap',
  DEPOT_DOWNLOAD: '/depot/download',
  DEPOT_DETAILS: '/depot/details',
  MOCK_AUTHORIZATION: '/mock_authorization',
  DESIGN_SYSTEM: '/design-system',
  REFERENTIEL_OUVRAGES: '/referentiel/ouvrages',
  SUIVI_MESURES: '/suivi/mesures',
  SUIVI_DECISIONS: '/suivi/decisions',
  SUIVI_DEPOTS: '/suivi/depots',
  SUIVI_CONFORMITE: '/suivi/conformite',
  EXPORT_DONNEES: '/export/donnees',
} as const;

export const getControleRoute = (depotId: string) => `/controle/${depotId}`;
