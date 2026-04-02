import { useLocation } from 'react-router';
import { Breadcrumb as DsfrBreadcrumb } from '@codegouvfr/react-dsfr/Breadcrumb';
import { AppRoutes } from '../routes';

export const Breadcrumb = () => {
  const location = useLocation();

  const getSegmentsFromPath = (pathname: string) => {
    if (pathname === AppRoutes.HOME) {
      return null;
    }

    const segments: Array<{ label: string; href: string }> = [];

    if (pathname.startsWith(AppRoutes.DEPOT_UPLOAD)) {
      segments.push({
        label: 'Déposer des données',
        href: AppRoutes.DEPOT_UPLOAD,
      });
    }

    if (pathname === AppRoutes.DEPOT_DETAILS) {
      segments.push({
        label: 'Tableau de bord',
        href: AppRoutes.DASHBOARD,
      });
    }

    if (pathname === AppRoutes.REFERENTIEL_POINTS_DE_MESURE) {
      segments.push({
        label: 'Tableau de bord',
        href: AppRoutes.DASHBOARD,
      });
    }

    if (pathname === AppRoutes.CONFORMITE_DASHBOARD) {
      segments.push({
        label: 'Tableau de bord',
        href: AppRoutes.DASHBOARD,
      });
    }

    if (pathname === AppRoutes.EVENEMENT_DASHBOARD) {
      segments.push({
        label: 'Suivi régulier',
        href: AppRoutes.DASHBOARD,
      });
    }

    return segments.length > 0 ? segments : [];
  };

  const segments = getSegmentsFromPath(location.pathname);

  if (!segments) {
    return null;
  }

  let currentPageLabel = '';
  if (location.pathname === AppRoutes.DEPOT_UPLOAD) {
    currentPageLabel = 'Sélection du fichier';
  } else if (location.pathname === AppRoutes.DEPOT_UPLOAD_RECAP) {
    currentPageLabel = 'Récapitulatif';
  } else if (location.pathname === AppRoutes.DASHBOARD) {
    currentPageLabel = 'Tableau de bord';
  } else if (location.pathname === AppRoutes.CONFORMITE_DASHBOARD) {
    currentPageLabel = 'Tableau de bord conformité';
  } else if (location.pathname.startsWith(AppRoutes.CONTROLE.split(':')[0])) {
    currentPageLabel = 'Détails du contrôle';
    segments.push({
      label: 'Tableau de bord',
      href: AppRoutes.DASHBOARD,
    });
  } else if (location.pathname === AppRoutes.DEPOT_DETAILS) {
    currentPageLabel = 'Détail des mesures déposées';
  } else if (location.pathname === AppRoutes.REFERENTIEL_POINTS_DE_MESURE) {
    currentPageLabel = 'Référentiel descriptif des ouvrages';
  } else if (location.pathname === AppRoutes.EVENEMENT_DASHBOARD) {
    currentPageLabel = 'Événements';
  }

  return (
    <DsfrBreadcrumb
      className="breadcrumb-container"
      currentPageLabel={currentPageLabel}
      homeLinkProps={{
        href: AppRoutes.HOME,
      }}
      segments={segments.map((segment) => ({
        label: segment.label,
        linkProps: {
          href: segment.href,
        },
      }))}
    />
  );
};
