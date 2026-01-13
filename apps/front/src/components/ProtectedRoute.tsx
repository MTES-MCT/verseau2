import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="fr-container fr-py-6w">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8">
            <div className="fr-card fr-p-4w">
              <div className="fr-card__body">
                <div className="fr-card__content">
                  <p className="fr-text--lead">Chargement...</p>
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

  if (!isAuthenticated) {
    // Save the attempted URL for redirecting after login
    sessionStorage.setItem('auth_return_to', location.pathname + location.search);
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
