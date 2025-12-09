

interface StatCardProps {
  count: number | string
  label: string
  icon: string
}

export function StatCard({ count, label, icon }: StatCardProps) {
  return (
    <div className="fr-col-12 fr-col-md-4">
      <div 
        className="fr-card fr-card--no-border fr-card--no-background fr-p-3w" 
        style={{ backgroundColor: 'var(--background-alt-grey)' }}
      >
        <div className="fr-grid-row fr-grid-row--middle">
          <div className="fr-col">
            <p className="fr-h2 fr-mb-0">{count}</p>
            <p className="fr-text--sm fr-mb-0">{label}</p>
          </div>
          <div className="fr-col-auto">
            <span className={`${icon} fr-icon--lg`} aria-hidden="true"></span>
            {/* <span className="fr-icon-ancient-gate-fill fr-icon--lg" aria-hidden="true"></span> */}
          </div>
        </div>
      </div>
    </div>
  )
}
