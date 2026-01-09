import { Header } from '@codegouvfr/react-dsfr/Header';
import { fr } from '@codegouvfr/react-dsfr';
import { useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';

export function AppHeader() {
  const location = useLocation();
  const { isAuthenticated, login, logout, user } = useAuth();

  const isNavItemActive = (href: string): boolean => {
    return location.pathname.startsWith(href) && (href !== '/' || location.pathname === '/');
  };

  return (
    <div className={fr.cx('fr-grid-row', 'fr-grid-row--middle')}>
      <Header
        brandTop={
          <span style={{ textAlign: 'left', display: 'block' }}>
            MINISTÈRE
            <br />
            DE LA TRANSITION
            <br />
            ÉCOLOGIQUE,
            <br />
            DE LA BIODIVERSITÉ
            <br />
            ET DES NÉGOCIATIONS
            <br />
            INTERNATIONALES
            <br />
            SUR LE CLIMAT ET LA NATURE
          </span>
        }
        operatorLogo={{
          alt: 'logo_portail_as',
          imgUrl:
            'https://assainissement.developpement-durable.gouv.fr/public/images/assainissement-collectif-logo-principal.png',
          orientation: 'horizontal',
        }}
        serviceTitle="Verseau 2.0"
        serviceTagline="Réseau de collecte et station de traitement des eaux usées"
        homeLinkProps={{ href: '/', title: 'Accueil' }}
        quickAccessItems={[
          {
            iconId: 'fr-icon-theme-fill',
            buttonProps: {
              'aria-controls': 'fr-theme-modal',
              'data-fr-opened': false,
            },
            text: "Paramètres d'affichage",
          },
          isAuthenticated && user
            ? {
                iconId: 'ri-logout-box-line',
                buttonProps: {
                  onClick: () => logout(),
                },
                text: `${user.prenom} ${user.nom}`,
              }
            : {
                iconId: 'fr-icon-lock-line',
                buttonProps: {
                  onClick: () => login(),
                },
                text: 'Se connecter',
              },
        ]}
        navigation={[
          {
            text: 'Tableau de bord',
            linkProps: { href: '/dashboard' },
            isActive: isNavItemActive('/dashboard'),
          },
          {
            text: "Gestion des données d'autosurveillance",
            isActive: isNavItemActive('/depot'),
            menuLinks: [
              {
                text: "Déposer des données d'autosurveillance",
                linkProps: { href: '/depot/upload' },
                isActive: isNavItemActive('/depot/upload'),
              },
              {
                text: "Télécharger des données d'autosurveillance",
                linkProps: { href: '/depot/download' },
                isActive: isNavItemActive('/depot/download'),
              },
              {
                text: 'Détail des mesures déposées',
                linkProps: { href: '/depot/details' },
                isActive: isNavItemActive('/depot/details'),
              },
            ],
          },
        ]}
      />
    </div>
  );
}
