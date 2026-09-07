import { useEffect, useRef, type ReactNode } from 'react';
import { fr } from '@codegouvfr/react-dsfr';
import { Button } from '@codegouvfr/react-dsfr/Button';
import './ReconnectionLayout.css';

interface ReconnectionLayoutProps {
  children: ReactNode;
  isReconnecting: boolean;
  hasError: boolean;
  onRetry: () => void;
  onLogin: () => void;
}

export function ReconnectionLayout({ children, isReconnecting, hasError, onRetry, onLogin }: ReconnectionLayoutProps) {
  const isBlocking = isReconnecting || hasError;
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isBlocking) {
      if (!previousFocusRef.current) {
        previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      }
      panelRef.current?.focus();
      return;
    }

    const previousFocus = previousFocusRef.current;
    previousFocusRef.current = null;
    if (previousFocus?.isConnected) {
      previousFocus.focus();
    }
  }, [isBlocking, hasError]);

  return (
    <div className="reconnection-layout">
      {isBlocking && (
        <div className="reconnection-layout__overlay">
          <div
            ref={panelRef}
            className={`${fr.cx('fr-p-2w')} reconnection-layout__panel`}
            tabIndex={-1}
            role={hasError ? 'alert' : 'status'}
            aria-live={hasError ? 'assertive' : 'polite'}
            aria-busy={isReconnecting || undefined}
          >
            {isReconnecting ? (
              <div className="reconnection-layout__message">
                <span className="fr-icon-loader-5-line fr-icon--lg reconnection-layout__spinner" aria-hidden="true" />
                <div>
                  <h2 className={fr.cx('fr-text--lg', 'fr-text--bold', 'fr-mb-0')}>Reconnexion</h2>
                  <p className={fr.cx('fr-text--sm', 'fr-mb-0')}>
                    Veuillez patienter pendant le renouvellement de votre session.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="reconnection-layout__message">
                  <span className="fr-icon-warning-fill fr-icon--lg" aria-hidden="true" />
                  <div>
                    <h2 className={fr.cx('fr-text--lg', 'fr-text--bold', 'fr-mb-0')}>Connexion interrompue</h2>
                    <p className={fr.cx('fr-text--sm', 'fr-mb-0')}>Le renouvellement de la connexion n’a pas abouti.</p>
                  </div>
                </div>
                <div className={fr.cx('fr-btns-group', 'fr-btns-group--inline-md')}>
                  <Button onClick={onRetry}>Réessayer</Button>
                  <Button priority="secondary" onClick={onLogin}>
                    Se connecter
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div
        className="reconnection-layout__content"
        inert={isBlocking || undefined}
        aria-hidden={isBlocking || undefined}
      >
        {children}
      </div>
    </div>
  );
}
