import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Stepper } from '@codegouvfr/react-dsfr/Stepper'
import { Upload } from '@codegouvfr/react-dsfr/Upload'
import { Alert } from '@codegouvfr/react-dsfr/Alert'
import { Button } from '@codegouvfr/react-dsfr/Button'

const steps = [
  'Sélection du flux et fichier',
  'Récapitulatif',
  'Envoi du fichier',
]

export function DepotUploadPage() {
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    setError(null)
    const file = event.target.files?.[0]
    if (!file) {
      setSelectedFile(null)
      return
    }
    setSelectedFile(file)
  }

  const handleNext = async () => {
    if (!selectedFile) return
    setError(null)
    try {
      const content = await selectedFile.text()
      navigate('/depot/upload/recap', {
        state: {
          fileName: selectedFile.name,
          fileContent: content,
        },
      })
    } catch (e) {
      setError("Le fichier n'a pas pu être lu. Vérifiez que le XML est valide.")
      console.error(e)
    }
  }

  return (
    <div className="fr-container fr-py-6w">
      <header className="fr-mb-4w">
        <p className="fr-badge fr-badge--new fr-mb-1w">Assistant de dépôt · VERSEAU 2.0</p>
        <h1 className="fr-h3 fr-mb-1w">Dépôt d&apos;un fichier de données SANDRE XML</h1>
        <p className="fr-text--lead fr-mb-0">
          Étape 1 : sélection du type de flux et du fichier de données
        </p>
      </header>

      <div className="fr-mb-4w">
        <Stepper
          currentStep={1}
          stepCount={steps.length}
          title={steps[0]}
          nextTitle={steps[1]}
        />
      </div>

      <section className="fr-card fr-card--no-border fr-p-4w">
        <h2 className="fr-h5 fr-mb-2w">Étape 1 – Choix du flux et du fichier XML</h2>
        <p className="fr-mb-2w">
          Sélectionnez le type de flux que vous souhaitez déposer, puis choisissez le fichier de
          données XML correspondant.
        </p>

        <div className="fr-mb-3w">
          <p className="fr-text--sm fr-mb-1w">Étapes du dépôt</p>
          <ul className="fr-ml-1w fr-pl-2w">
            {steps.map((step, index) => (
              <li key={step}>
                Étape {index + 1} — {step}
              </li>
            ))}
          </ul>
        </div>

        <Upload
          label="Fichier de données XML"
          hint={selectedFile ? `Fichier sélectionné : ${selectedFile.name}` : 'Formats acceptés : .xml'}
          nativeInputProps={{
            accept: '.xml',
            'aria-label': 'Sélectionner un fichier de données XML',
            onChange: handleFileChange,
          }}
        />

        {error ? (
          <div className="fr-mt-3w">
            <Alert
              severity="error"
              title="Erreur lors du traitement du fichier"
              description={error}
            />
          </div>
        ) : null}

        <div className="fr-grid-row fr-grid-row--right fr-mt-4w">
          <div className="fr-col-auto">
            <Button
              iconId="ri-arrow-right-line"
              iconPosition="right"
              onClick={handleNext}
              disabled={!selectedFile}
            >
              Passer à l&apos;étape 2
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

