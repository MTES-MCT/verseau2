import { Header } from '@codegouvfr/react-dsfr/Header';
import { fr } from '@codegouvfr/react-dsfr';
import { useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';

export function AppHeader() {
  const location = useLocation();
  const { isAuthenticated, login, logout } = useAuth();

  const isNavItemActive = (href: string): boolean => {
    return location.pathname.startsWith(href) && (href !== '/' || location.pathname === '/');
  };

  return (
    <div className={fr.cx('fr-grid-row', 'fr-grid-row--middle')}>
      <Header
        brandTop="Ministère de la Transition écologique"
        serviceTitle="Autosurveillance des systèmes d'assainissement"
        homeLinkProps={{ href: '/', title: 'Accueil' }}
        quickAccessItems={[
          isAuthenticated
            ? {
                iconId: 'ri-logout-box-line',
                buttonProps: {
                  onClick: () => logout(),
                },
                text: 'Déconnexion',
              }
            : {
                iconId: 'ri-user-line',
                buttonProps: {
                  onClick: () => login(),
                },
                text: 'Connexion',
              },
        ]}
        navigation={[
          {
            text: 'Tableau de bord',
            linkProps: { href: '/dashboard' },
            isActive: isNavItemActive('/dashboard'),
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
