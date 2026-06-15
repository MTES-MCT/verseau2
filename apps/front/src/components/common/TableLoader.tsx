import type { ReactNode } from 'react';
import { fr } from '@codegouvfr/react-dsfr';

interface TableLoaderProps {
  isLoading: boolean;
  isFetching: boolean;
  hasOuvrageSelected: boolean;
  children: ReactNode;
}

export function TableLoader({ isLoading, isFetching, hasOuvrageSelected, children }: TableLoaderProps) {
  if (!hasOuvrageSelected) {
    return (
      <p className={fr.cx('fr-text--lg', 'fr-my-4w')} role="status">
        Veuillez sélectionner un ouvrage pour afficher les résultats.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className={fr.cx('fr-my-4w')} role="status" aria-label="Chargement des données">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '1.5rem',
              height: '1.5rem',
              border: '3px solid var(--background-contrast-grey)',
              borderTop: '3px solid var(--text-action-high-blue-france)',
              borderRadius: '50%',
              animation: 'table-loader-spin 0.8s linear infinite',
            }}
          />
          <p className={fr.cx('fr-text--lg', 'fr-mb-0')}>Chargement des données...</p>
        </div>
        <style>{`@keyframes table-loader-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
      }}
    >
      {isFetching && (
        <div
          role="status"
          aria-label="Mise à jour des données"
          style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'var(--background-default-grey)',
            padding: '0.25rem 0.75rem',
            borderRadius: '0.25rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <div
            style={{
              width: '1rem',
              height: '1rem',
              border: '2px solid var(--background-contrast-grey)',
              borderTop: '2px solid var(--text-action-high-blue-france)',
              borderRadius: '50%',
              animation: 'table-loader-spin 0.8s linear infinite',
            }}
          />
          <span className={fr.cx('fr-text--xs')}>Mise à jour...</span>
          <style>{`@keyframes table-loader-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {children}
    </div>
  );
}
