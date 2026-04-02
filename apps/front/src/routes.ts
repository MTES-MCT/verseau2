export const AppRoutes = {
  HOME: '/',
  CALLBACK: '/callback',
  DASHBOARD: '/dashboard',
  CONFORMITE_DASHBOARD: '/conformite',
  CONTROLE: '/controle/:depotId',
  DEPOT_UPLOAD: '/depot/upload',
  DEPOT_UPLOAD_RECAP: '/depot/upload/recap',
  DEPOT_DOWNLOAD: '/depot/download',
  DEPOT_DETAILS: '/depot/details',
  REFERENTIEL: '/referentiel',
  REFERENTIEL_POINTS_DE_MESURE: '/referentiel/points-de-mesure',
  MOCK_AUTHORIZATION: '/mock_authorization',
  EVENEMENT_DASHBOARD: '/suivi-regulier/evenement',
  DESIGN_SYSTEM: '/design-system',
} as const;

export const getControleRoute = (depotId: string) => `/controle/${depotId}`;
