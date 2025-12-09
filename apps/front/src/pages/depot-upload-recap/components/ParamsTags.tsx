type ParamsTagsProps = {
  params: string[]
}

export function ParamsTags({ params }: ParamsTagsProps) {
  return (
    <section className="fr-card fr-card--no-border fr-p-4w fr-mb-4w">
      <h3 className="fr-h5 fr-mb-2w">Paramètres analysés</h3>
      <p className="fr-mb-2w">Les paramètres suivants sont présents dans le fichier déposé :</p>
      <div className="fr-tags-group">
        {params.length > 0 ? (
          params.map((param) => (
            <span key={param} className="fr-tag fr-tag--sm fr-mb-1w">
              {param}
            </span>
          ))
        ) : (
          <span className="fr-text-default--grey">Aucun paramètre détecté</span>
        )}
      </div>
    </section>
  )
}


