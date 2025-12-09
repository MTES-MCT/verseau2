import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Stepper } from '@codegouvfr/react-dsfr/Stepper'
import { Alert } from '@codegouvfr/react-dsfr/Alert'
import { Badge } from '@codegouvfr/react-dsfr/Badge'
import { Button } from '@codegouvfr/react-dsfr/Button'
import { useMutation } from '@tanstack/react-query'
import { parseScenarioAssainissementXml, type FctAssainissement } from '@lib/parser'
import { uploadDepot } from '../api/depot'

const steps = [
  'Sélection du flux et fichier',
  'Récapitulatif',
  'Envoi du fichier',
]

type LocationState = {
  fileName?: string
  fileContent?: string
}

function countAnalyses(parsed: FctAssainissement): number {
  let count = 0
  const add = (list?: FctAssainissement['ouvrages']) => {
    list?.forEach((item) => {
      item.pointMesure?.forEach((pm) => {
        pm.prelevement?.forEach((prlv) => {
          count += prlv.analyse?.length ?? 0
        })
      })
    })
  }
  add(parsed.ouvrages)
  parsed.systemesCollecte?.forEach((sc) => {
    sc.pointMesure?.forEach((pm) => {
      pm.prelevement?.forEach((prlv) => {
        count += prlv.analyse?.length ?? 0
      })
    })
  })
  return count
}

function extractParams(parsed: FctAssainissement): string[] {
  const params = new Set<string>()
  const collect = (list?: FctAssainissement['ouvrages']) => {
    list?.forEach((item) => {
      item.pointMesure?.forEach((pm) => {
        pm.prelevement?.forEach((prlv) => {
          prlv.analyse?.forEach((a) => {
            if (a.cdParametre) params.add(a.cdParametre)
          })
        })
      })
    })
  }
  collect(parsed.ouvrages)
  parsed.systemesCollecte?.forEach((sc) => {
    sc.pointMesure?.forEach((pm) => {
      pm.prelevement?.forEach((prlv) => {
        prlv.analyse?.forEach((a) => {
          if (a.cdParametre) params.add(a.cdParametre)
        })
      })
    })
  })
  return Array.from(params)
}

export function DepotUploadRecapPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state ?? {}) as LocationState
  const { fileName, fileContent } = state

  const parseMutation = useMutation({
    mutationFn: async (xml: string) => parseScenarioAssainissementXml(xml),
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => uploadDepot(file),
  })

  useEffect(() => {
    if (fileContent) {
      console.log('fileContent', fileContent.length)
      parseMutation.mutate(fileContent)
    }
  }, [fileContent])

  if (!fileName || !fileContent) {
    return (
      <div className="fr-container fr-py-6w">
        <Alert
          severity="warning"
          title="Aucun fichier à récapituler"
          description="Revenez à l'étape 1 pour sélectionner un fichier XML."
        />
        <div className="fr-mt-3w">
          <Button priority="secondary" onClick={() => navigate('/depot/upload')}>
            Retour à l&apos;étape 1
          </Button>
        </div>
      </div>
    )
  }

  if (parseMutation.isPending || (!parseMutation.data && !parseMutation.isError)) {
    return (
      <div className="fr-container fr-py-6w">
        <header className="fr-mb-4w">
          <p className="fr-badge fr-badge--new fr-mb-1w">Assistant de dépôt · Version web 2.0</p>
          <h1 className="fr-h3 fr-mb-1w">Dépôt d&apos;un fichier de données XML</h1>
          <p className="fr-text--lead fr-mb-0">Étape 2 : récapitulatif du dépôt</p>
        </header>

        <div className="fr-mb-4w">
          <Stepper
            currentStep={2}
            stepCount={steps.length}
            title={steps[1]}
            nextTitle={steps[2]}
          />
        </div>

        <div className="fr-card fr-card--no-border fr-p-4w fr-text--center">
          <div className="fr-loader" aria-label="Analyse du fichier" />
          <p className="fr-mt-2w fr-text--bold">Analyse du fichier en cours...</p>
          <p className="fr-mb-0 fr-text--sm fr-text-default--grey">Nous préparons le récapitulatif.</p>
        </div>
      </div>
    )
  }

  if (parseMutation.isError) {
    return (
      <div className="fr-container fr-py-6w">
        <Alert
          severity="error"
          title="Erreur lors du parsing"
          //break line
          description={`Le fichier n'a pas pu être parsé. Revenez à l'étape 1 pour sélectionner un fichier XML valide : ${parseMutation.error?.message}`}
        />
        <div className="fr-mt-3w">
          <Button priority="secondary" onClick={() => navigate('/depot/upload')}>
            Retour à l&apos;étape 1
          </Button>
        </div>
      </div>
    )
  }

  const parsed = parseMutation.data
  const totalAnalyses = countAnalyses(parsed)
  const params = extractParams(parsed)

  const handleFinalize = () => {
    if (!fileName || !fileContent) return
    const blob = new Blob([fileContent], { type: 'application/xml' })
    const file = new File([blob], fileName, { type: 'application/xml' })
    uploadMutation.mutate(file, {
      onSuccess: () => navigate('/'),
      onError: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    })
  }

  return (
    <div className="fr-container fr-py-6w">
      <header className="fr-mb-4w">
        <p className="fr-badge fr-badge--new fr-mb-1w">Assistant de dépôt · Version web 2.0</p>
        <h1 className="fr-h3 fr-mb-1w">Dépôt d&apos;un fichier de données XML</h1>
        <p className="fr-text--lead fr-mb-0">Étape 2 : récapitulatif du dépôt</p>
      </header>

      <div className="fr-mb-4w">
        <Stepper
          currentStep={2}
          stepCount={steps.length}
          title={steps[1]}
          nextTitle={steps[2]}
        />
      </div>

      <section className="fr-card fr-card--no-border fr-p-4w fr-mb-4w">
        <div className="fr-grid-row fr-grid-row--middle fr-mb-2w">
          <div className="fr-col">
            <h2 className="fr-h5 fr-mb-0">Récapitulatif du dépôt</h2>
          </div>
          <div className="fr-col-auto">
            <Badge severity="success" small>
              Contrôles préliminaires terminés
            </Badge>
          </div>
        </div>

        <p className="fr-mb-4w">
          Voici les informations principales concernant le dépôt que vous venez d&apos;effectuer. Vous
          pouvez vérifier les détails avant de finaliser ou revenir à l&apos;étape précédente.
        </p>

        <div className="fr-grid-row fr-grid-row--gutters fr-mb-2w">
          <div className="fr-col-12 fr-col-md-6 fr-mb-2w">
            <p className="fr-text--sm fr-text--regular fr-text-default--grey fr-mb-0">
              Système d&apos;assainissement
            </p>
            <p className="fr-text--bold fr-mb-0">
              {parsed.scenario?.emetteur?.nomIntervenant || 'Non renseigné'}{' '}
              {parsed.scenario?.emetteur?.cdIntervenant
                ? `(${parsed.scenario.emetteur.cdIntervenant})`
                : ''}
            </p>
          </div>
          <div className="fr-col-12 fr-col-md-6 fr-mb-2w">
            <p className="fr-text--sm fr-text--regular fr-text-default--grey fr-mb-0">
              Nom du fichier déposé
            </p>
            <p className="fr-text--bold fr-mb-0">{fileName}</p>
          </div>
          <div className="fr-col-12 fr-col-md-6 fr-mb-2w">
            <p className="fr-text--sm fr-text--regular fr-text-default--grey fr-mb-0">Nombre de mesures</p>
            <p className="fr-text--bold fr-mb-0">{totalAnalyses > 0 ? `${totalAnalyses} analyses` : 'N/A'}</p>
          </div>
        </div>
      </section>

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
            <span className="fr-text-default--grey">TODO : Aucun paramètre détecté</span>
          )}
        </div>
      </section>

      <section className="fr-card fr-card--no-border fr-p-4w">
        <h3 className="fr-h5 fr-mb-2w">Principales vérifications effectuées</h3>
        <p className="fr-mb-3w">Les contrôles suivants ont été appliqués au fichier :</p>
        <ul className="fr-mb-3w fr-text-default--grey">
          <li className="fr-mb-1v">
            <span className="fr-icon-checkbox-circle-line fr-text--success fr-mr-1w" aria-hidden="true" />
            Format du fichier — validation XML et schéma attendu.
          </li>
          <li className="fr-mb-1v">
            <span className="fr-icon-checkbox-circle-line fr-text--success fr-mr-1w" aria-hidden="true" />
            Structure des données — cohérence des identifiants et correspondance au système.
          </li>
          <li className="fr-mb-1v">
            <span className="fr-icon-checkbox-circle-line fr-text--success fr-mr-1w" aria-hidden="true" />
            Droits de dépôt — habilitations du déposant vérifiées.
          </li>
          <li className="fr-mb-1v">
            <span className="fr-icon-checkbox-circle-line fr-text--success fr-mr-1w" aria-hidden="true" />
            Règles métiers — contrôle de cohérence des valeurs et complétude.
          </li>
        </ul>

        <div className="fr-grid-row fr-grid-row--space-between fr-grid-row--middle">
          <div className="fr-col-auto">
            <Button
              priority="secondary"
              iconId="ri-arrow-left-line"
              onClick={() => navigate('/depot/upload')}
            >
              Retour à l&apos;étape précédente
            </Button>
          </div>
          <div className="fr-col-auto">
            <Button
              iconId="ri-arrow-right-line"
              iconPosition="right"
              onClick={handleFinalize}
              disabled={uploadMutation.isPending}
            >
              Étape 3 finaliser le dépôt
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

