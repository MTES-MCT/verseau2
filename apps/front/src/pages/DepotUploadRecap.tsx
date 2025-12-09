import {
  ChecksList,
  EmptyState,
  ErrorState,
  FooterActions,
  ParamsTags,
  ParsingLoader,
  RecapHeader,
  RecapSummaryCard,
} from './depot-upload-recap/components'
import { useDepotRecap } from './depot-upload-recap/useDepotRecap'

const steps = [
  'Sélection du flux et fichier',
  'Récapitulatif',
  'Envoi du fichier',
]

export function DepotUploadRecapPage() {
  const {
    fileName,
    hasFile,
    parsedData,
    params,
    totalAnalyses,
    parseMutation,
    uploadMutation,
    handleReturn,
    handleFinalize,
  } = useDepotRecap()

  if (!hasFile) {
    return <EmptyState onBack={handleReturn} />
  }

  if (parseMutation.isPending || (!parseMutation.data && !parseMutation.isError)) {
    return <ParsingLoader steps={steps} />
  }

  if (parseMutation.isError) {
    const errorMessage = `Le fichier n'a pas pu être parsé. Revenez à l'étape 1 pour sélectionner un fichier XML valide.${
      parseMutation.error instanceof Error ? ` ${parseMutation.error.message}` : ''
    }`
    return <ErrorState message={errorMessage} onBack={handleReturn} />
  }

  return (
    <div className="fr-container fr-py-6w">
      <RecapHeader steps={steps} currentStep={2} subtitle="Étape 2 : récapitulatif du dépôt" />

      <RecapSummaryCard
        systemName={parsedData?.scenario?.emetteur?.nomIntervenant}
        systemCode={parsedData?.scenario?.emetteur?.cdIntervenant}
        fileName={fileName || 'Non renseigné'}
        totalAnalyses={totalAnalyses}
      />

      <ParamsTags params={params} />

      <ChecksList />

      <FooterActions
        onBack={handleReturn}
        onFinalize={handleFinalize}
        finalizeDisabled={uploadMutation.isPending}
      />
    </div>
  )
}