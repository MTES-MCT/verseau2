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
            text: 'Suivi de conformité',
            isActive: isNavItemActive('/suivi') || isNavItemActive(AppRoutes.REFERENTIEL_OUVRAGES),
            menuLinks: [
              {
                text: 'Référentiel des ouvrages',
                linkProps: { href: AppRoutes.REFERENTIEL_OUVRAGES },
                isActive: isNavItemActive(AppRoutes.REFERENTIEL_OUVRAGES),
              },
              {
                text: 'Suivi des mesures',
                linkProps: { href: AppRoutes.SUIVI_MESURES },
                isActive: isNavItemActive(AppRoutes.SUIVI_MESURES),
              },
              {
                text: 'Dépôts attendus',
                linkProps: { href: AppRoutes.SUIVI_DEPOTS },
                isActive: isNavItemActive(AppRoutes.SUIVI_DEPOTS),
              },
              {
                text: 'Conformité prévisionnelle',
                linkProps: { href: AppRoutes.SUIVI_CONFORMITE },
                isActive: isNavItemActive(AppRoutes.SUIVI_CONFORMITE),
              },
              {
                text: 'Export des données',
                linkProps: { href: AppRoutes.EXPORT_DONNEES },
                isActive: isNavItemActive(AppRoutes.EXPORT_DONNEES),
              },
              {
                text: 'Historique des décisions',
                linkProps: { href: AppRoutes.SUIVI_DECISIONS },
                isActive: isNavItemActive(AppRoutes.SUIVI_DECISIONS),
              },
            ],
          },
          {
            text: 'Tableau de bord',
            linkProps: { href: AppRoutes.DASHBOARD },
            isActive: isNavItemActive(AppRoutes.DASHBOARD),
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
