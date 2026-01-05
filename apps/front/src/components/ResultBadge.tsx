import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { EvenementType } from '@lib/dossier';

type ResultBadgeProps = {
  evenementType: EvenementType | undefined;
  small?: boolean;
  className?: string;
};

export function ResultBadge({ evenementType, small, className }: ResultBadgeProps) {
  if (evenementType === EvenementType.ERREUR) {
    return (
      <Badge severity="error" small={small} className={className}>
        Échec
      </Badge>
    );
  }
  if (evenementType === EvenementType.AVERTISSEMENT) {
    return (
      <Badge severity="warning" small={small} className={className}>
        Avertissement
      </Badge>
    );
  }
  return (
    <Badge severity="success" small={small} className={className}>
      Succès
    </Badge>
  );
}
