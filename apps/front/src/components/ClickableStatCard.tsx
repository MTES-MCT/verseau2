import { fr } from '@codegouvfr/react-dsfr';
import { StatCard } from './StatCard';

interface ClickableStatCardProps {
  count: number | string;
  label: string;
  icon: string;
  color?: string;
  onClick: () => void;
  isActive: boolean;
}

export function ClickableStatCard({ count, label, icon, color, onClick, isActive }: ClickableStatCardProps) {
  return (
    <div className="fr-col-12 fr-col-md-4">
      <button
        onClick={onClick}
        aria-pressed={isActive}
        style={{
          border: isActive ? '2px solid var(--border-action-high-blue-france)' : '2px solid transparent',
          width: '100%',
        }}
        className={fr.cx('fr-card__body', 'fr-p-0')}
      >
        <StatCard count={count} label={label} icon={icon} color={color} />
      </button>
    </div>
  );
}
