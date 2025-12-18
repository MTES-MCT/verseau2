import { useState } from 'react';
import { useNavigate } from 'react-router';
import { authService } from '../services/auth.service';

/**
 * Page de simulation d'authentification OIDC
 * Utile pour le développement sans passer par Cerbère
 */
export default function AuthenticationCallbackPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSimulateAuth = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Simule un code d'autorisation
      const mockCode = 'mock-authorization-code-' + Date.now();
      const mockState = 'mock-state-' + Date.now();
      const mockNonce = 'mock-nonce-' + Date.now();

      // Stocke temporairement state et nonce comme le ferait le flow réel
      sessionStorage.setItem('oidc_state', mockState);
      sessionStorage.setItem('oidc_nonce', mockNonce);

      // Simule le callback OIDC
      await authService.handleCallback(mockCode, mockState);

      // Redirige vers le dashboard après succès
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Simulation authentication failed:', err);
      setError(err instanceof Error ? err.message : 'Échec de la simulation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRealAuth = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Déclenche le vrai flow OIDC
      await authService.login();
    } catch (err) {
      console.error('Real authentication failed:', err);
      setError(err instanceof Error ? err.message : "Échec de l'authentification");
      setIsLoading(false);
    }
  };

  return (
    <div className="fr-container">
      <div className="fr-grid-row fr-grid-row--center">
        <div className="fr-col-12 fr-col-md-8 fr-col-lg-6">
          <div className="fr-card fr-p-4w">
            <div className="fr-card__body">
              <div className="fr-card__content">
                <h1 className="fr-h3">🔐 Authentification Verseau</h1>

                <p className="fr-text--lead fr-mb-4w">Choisissez votre méthode d'authentification</p>

                {error && (
                  <div className="fr-alert fr-alert--error fr-mb-4w">
                    <p className="fr-alert__title">Erreur</p>
                    <p>{error}</p>
                  </div>
                )}

                {/* Bouton pour simuler l'authentification (mode développement) */}
                <div className="fr-mb-3w">
                  <button
                    className="fr-btn fr-btn--lg fr-btn--secondary fr-btn--icon-left fr-icon-test-tube-line"
                    onClick={handleSimulateAuth}
                    disabled={isLoading}
                    style={{ width: '100%' }}
                  >
                    {isLoading ? 'Simulation en cours...' : '🧪 Simuler authentification OIDC (Mock)'}
                  </button>
                  <p className="fr-text--sm fr-hint-text fr-mt-1w">
                    Crée automatiquement un utilisateur de test sans passer par Cerbère.
                    <br />
                    Nécessite <code>OIDC_MOCK=true</code> dans le backend.
                  </p>
                </div>

                {/* Info développement */}
                <div className="fr-callout fr-callout--blue-ecume fr-mt-4w">
                  <p className="fr-callout__title">ℹ️ Mode développement</p>
                  <p className="fr-text--sm">
                    Cette page est utile pour tester l'application sans configuration OIDC complète. En production,
                    utilisez uniquement l'authentification Cerbère.
                  </p>
                </div>

                {/* Lien retour */}
                <div className="fr-mt-4w" style={{ textAlign: 'center' }}>
                  <a href="/" className="fr-link fr-icon-arrow-left-line fr-link--icon-left">
                    Retour à l'accueil
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
