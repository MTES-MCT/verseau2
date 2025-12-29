import { fr } from '@codegouvfr/react-dsfr';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { useNavigate } from 'react-router';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className={fr.cx('fr-container', 'fr-py-12w')}>
      <div className={fr.cx('fr-grid-row', 'fr-grid-row--center')}>
        <div className={fr.cx('fr-col-12', 'fr-col-md-8', 'fr-col-lg-6')}>
          <h1 className={fr.cx('fr-h1')}>Bienvenue sur Verseau</h1>
          <p className={fr.cx('fr-text--lead')}>L'application d'autosurveillance des systèmes d'assainissement.</p>
          <div className={fr.cx('fr-mt-4w')}>
            <Button onClick={() => navigate('/dashboard')}>Accéder au tableau de bord</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
