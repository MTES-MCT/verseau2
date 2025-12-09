import { Stepper } from '@codegouvfr/react-dsfr/Stepper'

type RecapHeaderProps = {
  steps: string[]
  currentStep: number
  subtitle: string
}

export function RecapHeader({ steps, currentStep, subtitle }: RecapHeaderProps) {
  const nextTitle = steps[currentStep] ?? steps[currentStep - 1]

  return (
    <header className="fr-mb-4w">
      <p className="fr-badge fr-badge--new fr-mb-1w">Assistant de dépôt · Version web 2.0</p>
      <h1 className="fr-h3 fr-mb-1w">Dépôt d&apos;un fichier de données XML</h1>
      <p className="fr-text--lead fr-mb-0">{subtitle}</p>

      <div className="fr-mt-4w">
        <Stepper
          currentStep={currentStep}
          stepCount={steps.length}
          title={steps[currentStep - 1]}
          nextTitle={nextTitle}
        />
      </div>
    </header>
  )
}


