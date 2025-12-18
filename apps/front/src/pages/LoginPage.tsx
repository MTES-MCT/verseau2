import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login, isLoading } = useAuth();

  useEffect(() => {
    // Automatically redirect to OIDC login
    login().catch((error) => {
      console.error('Failed to initiate login:', error);
    });
  }, [login]);

  return (
    <div className="fr-container fr-py-6w">
      <div className="fr-grid-row fr-grid-row--center">
        <div className="fr-col-12 fr-col-md-8 fr-col-lg-6">
          <div className="fr-card fr-p-4w">
            <div className="fr-card__body">
              <div className="fr-card__content">
                <h1 className="fr-h3">Connexion à Verseau</h1>
                <p className="fr-text--lead">
                  {isLoading
                    ? 'Redirection vers la page de connexion Cerbère...'
                    : 'Échec de la connexion. Veuillez réessayer.'}
                </p>
                {!isLoading && (
                  <button className="fr-btn fr-mt-2w" onClick={() => login()}>
                    Se connecter
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

