import { Badge } from '@codegouvfr/react-dsfr/Badge';
import type { ReactNode } from 'react';

export function renderPrisEnCompteBadge(value: boolean): ReactNode {
  return (
    <Badge severity={value ? 'success' : 'warning'} small>
      {value ? 'Pris en compte' : 'Non pris en compte'}
    </Badge>
  );
}
