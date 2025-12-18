import { Header } from '@codegouvfr/react-dsfr/Header';
import { fr } from '@codegouvfr/react-dsfr';
import { useLocation } from 'react-router';

export function AppHeader() {
  const location = useLocation();

  const isNavItemActive = (href: string): boolean => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className={fr.cx('fr-grid-row', 'fr-grid-row--middle')}>
      <Header
        brandTop="Ministère de la Transition écologique"
        serviceTitle="Autosurveillance des systèmes d'assainissement"
        homeLinkProps={{ href: '/', title: 'Accueil' }}
        quickAccessItems={[
          {
            iconId: 'ri-user-line',
            linkProps: { href: '/profile', title: 'Mon compte' },
            text: 'Mon compte',
          },
        ]}
        navigation={[
          {
            text: 'Tableau de bord',
            linkProps: { href: '/' },
            isActive: isNavItemActive('/'),
          },
          {
            text: 'Déposer des données',
            linkProps: { href: '/depot/upload' },
            isActive: isNavItemActive('/depot/upload'),
          },
        ]}
      />
    </div>
  );
}
