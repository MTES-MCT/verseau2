import type { CSSProperties, ReactNode } from 'react';
import { fr } from '@codegouvfr/react-dsfr';
import { APP_ENV } from '../appConfig';
import { getEnvironmentLabel } from '../helper/environment';
import './EnvironmentWatermark.css';

function createWatermarkBackground(label: string, color: string): string {
  const escapedLabel = label.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="watermark" width="280" height="180" patternUnits="userSpaceOnUse" patternTransform="rotate(-25)">
        <text x="140" y="90" text-anchor="middle" dominant-baseline="middle"
          font-family="Arial, sans-serif" font-size="20" letter-spacing="1.6" fill="${color}" fill-opacity="0.08">${escapedLabel}</text>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#watermark)" />
  </svg>`;

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function EnvironmentWatermark({ children }: { children?: ReactNode }) {
  const environmentLabel = getEnvironmentLabel(APP_ENV);

  if (!environmentLabel) {
    return <>{children}</>;
  }

  const style = {
    '--environment-watermark-light': createWatermarkBackground(environmentLabel, '#161616'),
    '--environment-watermark-dark': createWatermarkBackground(environmentLabel, '#ffffff'),
  } as CSSProperties;

  return (
    <div className="environment-watermark" style={style}>
      <span className={fr.cx('fr-sr-only')}>Environnement : {environmentLabel}</span>
      {children}
    </div>
  );
}
