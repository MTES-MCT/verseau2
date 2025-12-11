import { RecapCard } from './RecapCard';

export function ChecksList() {
  return (
    <RecapCard className="fr-mb-0">
      <h3 className="fr-h5 fr-mb-1w">Principales vérifications effectuées</h3>
      <p className="fr-mb-3w fr-text-default--grey">Les contrôles suivants ont été appliqués au fichier :</p>
      <div className="fr-mb-3w fr-text-default--grey">
        <p className="fr-mb-1v">
          <span className="fr-icon-checkbox-circle-line fr-text--success fr-mr-1w" aria-hidden="true" />
          TODO: Format du fichier — validation XML et schéma attendu.
        </p>
        <p className="fr-mb-1v">
          <span className="fr-icon-checkbox-circle-line fr-text--success fr-mr-1w" aria-hidden="true" />
          TODO: Structure des données — cohérence des identifiants et correspondance au système.
        </p>
        <p className="fr-mb-1v">
          <span className="fr-icon-checkbox-circle-line fr-text--success fr-mr-1w" aria-hidden="true" />
          TODO: Droits de dépôt — habilitations du déposant vérifiées.
        </p>
        <p className="fr-mb-1v">
          <span className="fr-icon-checkbox-circle-line fr-text--success fr-mr-1w" aria-hidden="true" />
          TODO: Règles métiers — contrôle de cohérence des valeurs et complétude.
        </p>
      </div>
    </RecapCard>
  );
}
