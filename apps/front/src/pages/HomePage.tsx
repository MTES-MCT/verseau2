import { fr } from '@codegouvfr/react-dsfr';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { AppRoutes } from '../routes';

export function HomePage() {
  const navigate = useNavigate();
  const { authenticatedUser } = useAuth();

  return (
    <div className="home-background">
      <div className={fr.cx('fr-container', 'fr-py-12w')}>
        <div className={fr.cx('fr-grid-row', 'fr-grid-row--center')}>
          <div className={fr.cx('fr-col-12', 'fr-col-md-8', 'fr-col-lg-6')}>
            <h1 className={fr.cx('fr-h1')}>Bienvenue sur Verseau 2</h1>
            {authenticatedUser && (
              <div className={fr.cx('fr-mb-4w')}>
                <p className={fr.cx('fr-text--lead', 'fr-mb-1v')}>
                  {authenticatedUser.user.prenom || authenticatedUser.user.nom
                    ? `Bonjour ${authenticatedUser.user.prenom} ${authenticatedUser.user.nom}`.trim()
                    : 'Bienvenue sur votre espace'}
                </p>
                {authenticatedUser.user.mel && (
                  <p className={fr.cx('fr-text--sm', 'fr-hint-text')}>
                    <span>{authenticatedUser.user.mel}</span>
                  </p>
                )}
              </div>
            )}
            <p className={fr.cx('fr-text--lead')}>L'application d'autosurveillance des systèmes d'assainissement.</p>
            <div className={fr.cx('fr-mt-4w')}>
              {authenticatedUser ? (
                <Button onClick={() => navigate(AppRoutes.DASHBOARD)}>Accéder au tableau de bord</Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
