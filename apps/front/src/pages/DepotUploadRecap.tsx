import {
  ChecksList,
  EmptyState,
  ErrorState,
  FooterActions,
  ParamsTags,
  ParsingLoader,
  RecapHeader,
  RecapSummaryCard,
} from './depot-upload-recap/components';
import { useDepotRecap } from './depot-upload-recap/useDepotRecap';
import { Alert } from '@codegouvfr/react-dsfr/Alert';

const steps = ['Sélection du flux et fichier', 'Récapitulatif', 'Envoi du fichier'];

export function DepotUploadRecapPage() {
  const {
    fileName,
    hasFile,
    parsedData,
    parametreNames,
    totalAnalyses,
    parseMutation,
    uploadMutation,
    droitsDeDepotStatus,
    handleReturn,
    handleFinalize,
  } = useDepotRecap();

  if (!hasFile) {
    return <EmptyState onBack={handleReturn} />;
  }

  if (parseMutation.isPending || (!parseMutation.data && !parseMutation.isError)) {
    return <ParsingLoader steps={steps} />;
  }

  if (parseMutation.isError) {
    const errorMessage = `Le fichier n'a pas pu être parsé. Revenez à l'étape 1 pour sélectionner un fichier XML valide.${
      parseMutation.error instanceof Error ? ` ${parseMutation.error.message}` : ''
    }`;
    return <ErrorState message={errorMessage} onBack={handleReturn} />;
  }

  return (
    <div className="fr-background-alt--grey fr-pt-6w fr-pb-8w">
      <div className="fr-container">
        <RecapHeader steps={steps} currentStep={2} subtitle="Étape 2 : récapitulatif du dépôt" />

        <RecapSummaryCard
          systemName={parsedData?.scenario?.emetteur?.nomIntervenant}
          systemCode={parsedData?.scenario?.emetteur?.cdIntervenant}
          fileName={fileName || 'Non renseigné'}
          totalAnalyses={totalAnalyses}
        />

        <ParamsTags params={parametreNames} />

        <ChecksList droitsDeDepotStatus={droitsDeDepotStatus} />

        {uploadMutation.isPending && <p role="status">Envoi et confirmation du fichier en cours…</p>}
        {uploadMutation.isError && (
          <Alert
            className="fr-mb-3w"
            severity="error"
            title="Le dépôt n’a pas pu être confirmé"
            description="Réessayez en cliquant sur « Finaliser le dépôt ». Si le fichier a déjà été envoyé, seule la confirmation sera relancée."
          />
        )}

        <FooterActions
          onBack={handleReturn}
          onFinalize={handleFinalize}
          finalizeDisabled={uploadMutation.isPending || droitsDeDepotStatus !== 'authorized'}
        />
      </div>
    </div>
  );
}
