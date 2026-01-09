import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { authService } from '../services/auth.service';
import { useAuth } from '../hooks/useAuth';

export default function CallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { refreshUser } = useAuth();
  const callbackProcessed = useRef(false);

  useEffect(() => {
    if (callbackProcessed.current) {
      return;
    }
    callbackProcessed.current = true;

    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Handle OIDC errors
      if (errorParam) {
        setError(`Erreur d'authentification: ${errorParam} - ${errorDescription || 'Aucune description'}`);
        return;
      }

      if (!code || !state) {
        setError('Paramètres manquants dans le callback');
        return;
      }

      try {
        await authService.handleCallback(code, state);

        await refreshUser();

        const returnTo = sessionStorage.getItem('auth_return_to');
        sessionStorage.removeItem('auth_return_to');

        // Sécurisation : on s'assure que le chemin est relatif et ne commence pas par //
        const safeReturnTo = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
        navigate(safeReturnTo, { replace: true });
      } catch (err) {
        console.error('Callback error:', err);
        setError(err instanceof Error ? err.message : "Échec de l'authentification");
      }
    };

    handleCallback();
  }, [searchParams, navigate, refreshUser]);

  if (error) {
    return (
      <div className="fr-container fr-py-6w">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8 fr-col-lg-6">
            <div className="fr-alert fr-alert--error">
              <h3 className="fr-alert__title">Erreur d'authentification</h3>
              <p>{error}</p>
              <button
                className="fr-btn fr-btn--secondary fr-mt-2w"
                onClick={() => navigate('/login', { replace: true })}
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fr-container fr-py-6w">
      <div className="fr-grid-row fr-grid-row--center">
        <div className="fr-col-12 fr-col-md-8 fr-col-lg-6">
          <div className="fr-card fr-p-4w">
            <div className="fr-card__body">
              <div className="fr-card__content">
                <h1 className="fr-h3">Authentification en cours...</h1>
                <p className="fr-text--lead">Veuillez patienter pendant que nous finalisons votre connexion.</p>
                <div className="fr-mt-2w" style={{ display: 'flex', justifyContent: 'center' }}>
                  <span className="fr-icon-loader-5-line fr-icon--lg" aria-hidden="true"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
