interface StatCardProps {
  count: number | string;
  label: string;
  icon: string;
  color?: string;
}

export function StatCard({ count, label, icon, color }: StatCardProps) {
  return (
    <div
      className="fr-card fr-card--no-border fr-card--no-background fr-p-3w"
      style={{ backgroundColor: 'var(--background-alt-grey)' }}
    >
      <div className="fr-grid-row fr-grid-row--middle">
        <div className="fr-col">
          <p className="fr-h2 fr-mb-0" style={{ color: color }}>
            {count}
          </p>
          <p className="fr-text--sm fr-mb-0">{label}</p>
        </div>
        <div className="fr-col-auto">
          <span className={`${icon} fr-icon--lg`} style={{ color: color }} aria-hidden="true"></span>
        </div>
      </div>
    </div>
  );
}
