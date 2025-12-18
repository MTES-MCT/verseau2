import { RecapCard } from './RecapCard';

type ParamsTagsProps = {
  params: string[];
};

export function ParamsTags({ params }: ParamsTagsProps) {
  return (
    <RecapCard className="fr-mb-4w">
      <h3 className="fr-h5 fr-mb-1w">Paramètres analysés</h3>
      <p className="fr-mb-3w fr-text-default--grey">
        Liste non exhaustive des paramètres présents dans le fichier déposé :
      </p>
      <div className="fr-tags-group fr-mb-0">
        {params.length > 0 ? (
          <>
            {params.slice(0, 20).map((param) => (
              <span key={param} className="fr-tag fr-tag--sm fr-mb-1w">
                {param}
              </span>
            ))}
            <span className="fr-mb-1w">...</span>
          </>
        ) : (
          <span className="fr-text-default--grey">Aucun paramètre détecté</span>
        )}
      </div>
    </RecapCard>
  );
}
