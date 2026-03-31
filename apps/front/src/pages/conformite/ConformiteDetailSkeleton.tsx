import { fr } from '@codegouvfr/react-dsfr';
import React from 'react';
import { SkeletonLine } from '../../components/common/Skeleton';
import { SCL_METRICS, STEU_METRICS } from './ConformiteDetail.constants';

export function LoadingState({
  mode,
  renderDetailTable,
}: {
  mode: 'steu' | 'scl';
  renderDetailTable: (data: React.ReactNode[][]) => React.ReactNode;
}) {
  const metrics = mode === 'steu' ? STEU_METRICS : SCL_METRICS;
  const data = metrics.map((metric, index) => [
    metric,
    <SkeletonLine key={`number-${index}`} width="100%" />,
    <SkeletonLine key={`label-${index}`} width={index % 2 === 0 ? '80%' : '65%'} />,
  ]);

  return (
    <div aria-live="polite" aria-busy="true">
      <p className={fr.cx('fr-sr-only')}>Chargement...</p>
      {renderDetailTable(data)}
    </div>
  );
}
