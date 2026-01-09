import { useLocation } from 'react-router';
import { Breadcrumb as DsfrBreadcrumb } from '@codegouvfr/react-dsfr/Breadcrumb';

export const Breadcrumb = () => {
  const location = useLocation();

  const getSegmentsFromPath = (pathname: string) => {
    if (pathname === '/') {
      return null;
    }

    const segments: Array<{ label: string; href: string }> = [];

    if (pathname.startsWith('/depot/upload')) {
      segments.push({
        label: 'Déposer des données',
        href: '/depot/upload',
      });
    }

    return segments.length > 0 ? segments : [];
  };

  const segments = getSegmentsFromPath(location.pathname);

  if (!segments) {
    return null;
  }

  let currentPageLabel = '';
  if (location.pathname === '/depot/upload') {
    currentPageLabel = 'Sélection du fichier';
  } else if (location.pathname === '/depot/upload/recap') {
    currentPageLabel = 'Récapitulatif';
  } else if (location.pathname.startsWith('/controle/')) {
    currentPageLabel = 'Détails du contrôle';
    segments.push({
      label: 'Tableau de bord',
      href: '/dashboard',
    });
  }

  return (
    <DsfrBreadcrumb
      className="breadcrumb-container"
      currentPageLabel={currentPageLabel}
      homeLinkProps={{
        href: '/',
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
