import { Badge } from '@codegouvfr/react-dsfr/Badge';

export function QualificationBadge({ qualification }: { qualification: string | null }) {
  if (!qualification) {
    return <>-</>;
  }
  const severity = qualification.toLowerCase().includes('qualif') ? 'success' : 'info';
  return (
    <Badge severity={severity} small>
      {qualification}
    </Badge>
  );
}
