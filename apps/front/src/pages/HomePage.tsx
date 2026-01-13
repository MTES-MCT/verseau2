import { fr } from '@codegouvfr/react-dsfr';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { AppRoutes } from '../routes';

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="home-background">
      <div className={fr.cx('fr-container', 'fr-py-12w')}>
        <div className={fr.cx('fr-grid-row', 'fr-grid-row--center')}>
          <div className={fr.cx('fr-col-12', 'fr-col-md-8', 'fr-col-lg-6')}>
            <h1 className={fr.cx('fr-h1')}>Bienvenue sur Verseau</h1>
            {user && (
              <div className={fr.cx('fr-mb-4w')}>
                <p className={fr.cx('fr-text--lead', 'fr-mb-1v')}>
                  {user.prenom || user.nom
                    ? `Bonjour ${user.prenom} ${user.nom}`.trim()
                    : user.login && user.login !== user.matricule
                      ? `Bonjour ${user.login}`
                      : 'Bienvenue sur votre espace'}
                </p>
                {(user.mel || user.unite || user.matricule) && (
                  <p className={fr.cx('fr-text--sm', 'fr-hint-text')}>
                    {user.mel && <span>{user.mel}</span>}
                    {user.unite && <span>{user.mel ? ` • ${user.unite}` : user.unite}</span>}
                    {user.matricule && (
                      <span>
                        {user.mel || user.unite
                          ? ` • Identifiant : ${user.matricule}`
                          : `Identifiant : ${user.matricule}`}
                      </span>
                    )}
                  </p>
                )}
              </div>
            )}
            <p className={fr.cx('fr-text--lead')}>L'application d'autosurveillance des systèmes d'assainissement.</p>
            <div className={fr.cx('fr-mt-4w')}>
              {user ? <Button onClick={() => navigate(AppRoutes.DASHBOARD)}>Accéder au tableau de bord</Button> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
