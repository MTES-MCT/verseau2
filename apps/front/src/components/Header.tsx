import { Header } from '@codegouvfr/react-dsfr/Header';
import { fr } from '@codegouvfr/react-dsfr';
import { useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { AppRoutes } from '../routes';

export function AppHeader() {
  const location = useLocation();
  const { isAuthenticated, login, logout, authenticatedUser } = useAuth();

  const isNavItemActive = (href: string): boolean => {
    return location.pathname.startsWith(href) && (href !== AppRoutes.HOME || location.pathname === AppRoutes.HOME);
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
        serviceTitle="Verseau 2.0"
        serviceTagline="Réseau de collecte et station de traitement des eaux usées"
        homeLinkProps={{ href: AppRoutes.HOME, title: 'Accueil' }}
        quickAccessItems={[
          {
            iconId: 'fr-icon-theme-fill',
            buttonProps: {
              'aria-controls': 'fr-theme-modal',
              'data-fr-opened': false,
            },
            text: "Paramètres d'affichage",
          },
          isAuthenticated && authenticatedUser ? (
            <button
              className="fr-btn fr-btn--tertiary-no-outline ri-logout-box-line"
              onClick={() => logout()}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.125rem' }}>
                <span>{`${authenticatedUser.user.prenom} ${authenticatedUser.user.nom}`.trim()}</span>
                {authenticatedUser.intervenant && (
                  <span style={{ fontSize: '0.65rem', opacity: 0.8, lineHeight: 1 }}>
                    {authenticatedUser.intervenant.nom}
                  </span>
                )}
              </span>
            </button>
          ) : (
            {
              iconId: 'fr-icon-lock-line',
              buttonProps: {
                onClick: () => login(),
              },
              text: 'Se connecter',
            }
          ),
        ]}
        navigation={[
          {
            text: 'Tableau de bord',
            linkProps: { href: AppRoutes.DASHBOARD },
            isActive: isNavItemActive(AppRoutes.DASHBOARD),
          },
          {
            text: 'Suivi régulier',
            isActive: isNavItemActive('/suivi-regulier'),
            menuLinks: [
              {
                text: 'Bilans',
                linkProps: { href: AppRoutes.BILAN_DASHBOARD },
                isActive: isNavItemActive(AppRoutes.BILAN_DASHBOARD),
              },
              {
                text: 'Conformité',
                linkProps: { href: AppRoutes.CONFORMITE_DASHBOARD },
                isActive: isNavItemActive(AppRoutes.CONFORMITE_DASHBOARD),
              },
              {
                text: 'Événements',
                linkProps: { href: AppRoutes.EVENEMENT_DASHBOARD },
                isActive: isNavItemActive(AppRoutes.EVENEMENT_DASHBOARD),
              },
            ],
          },
          {
            text: "Gestion des données d'autosurveillance",
            isActive: isNavItemActive('/depot'),
            menuLinks: [
              {
                text: "Déposer des données d'autosurveillance",
                linkProps: { href: AppRoutes.DEPOT_UPLOAD },
                isActive: isNavItemActive(AppRoutes.DEPOT_UPLOAD),
              },
              {
                text: "Télécharger des données d'autosurveillance",
                linkProps: { href: AppRoutes.DEPOT_DOWNLOAD },
                isActive: isNavItemActive(AppRoutes.DEPOT_DOWNLOAD),
              },
              {
                text: 'Détail des mesures déposées',
                linkProps: { href: AppRoutes.DEPOT_DETAILS },
                isActive: isNavItemActive(AppRoutes.DEPOT_DETAILS),
              },
            ],
          },
          {
            text: 'Référentiel descriptif des ouvrages',
            isActive: isNavItemActive(AppRoutes.REFERENTIEL),
            menuLinks: [
              {
                text: 'Points de mesure',
                linkProps: { href: AppRoutes.REFERENTIEL_POINTS_DE_MESURE },
                isActive: isNavItemActive(AppRoutes.REFERENTIEL_POINTS_DE_MESURE),
              },
            ],
          },
          ...(import.meta.env.DEV
            ? [
                {
                  text: 'Design System',
                  linkProps: { href: AppRoutes.DESIGN_SYSTEM },
                  isActive: isNavItemActive(AppRoutes.DESIGN_SYSTEM),
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}
