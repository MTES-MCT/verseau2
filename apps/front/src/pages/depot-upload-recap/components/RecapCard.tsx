import { cx } from '@codegouvfr/react-dsfr/tools/cx'
import type { ReactNode } from 'react'
import './RecapCard.css'

type RecapCardProps = {
  children: ReactNode
  className?: string
  tone?: 'default' | 'muted'
}

export function RecapCard({ children, className = '', tone = 'default' }: RecapCardProps) {
  return (
    <section
      className={cx(
        'fr-card',
        'fr-card--no-border',
        'fr-p-5w',
        'recap-card',
        tone === 'muted' && 'recap-card--muted',
        className,
      )}
    >
      {children}
    </section>
  )
}

