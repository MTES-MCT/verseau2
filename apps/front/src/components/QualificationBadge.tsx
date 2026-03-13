import type { AlertProps } from '@codegouvfr/react-dsfr/Alert';
import { Badge } from '@codegouvfr/react-dsfr/Badge';

export function QualificationBadge({ qualification }: { qualification: string | null }) {
  if (!qualification) {
    return <>-</>;
  }
  let severity: AlertProps.Severity;
  if (qualification.toLowerCase() === 'correcte') {
    severity = 'success';
  } else if (qualification.toLowerCase() === 'non qualifié') {
    severity = 'info';
  } else if (qualification.toLowerCase() === 'incorrecte') {
    severity = 'error';
  } else {
    severity = 'info';
  }
  return (
    <Badge severity={severity} small>
      {qualification}
    </Badge>
  );
}
