import { fr } from '@codegouvfr/react-dsfr';
import './SortableHeader.css';

interface SortableHeaderProps<TSortBy extends string> {
  label: string;
  sortBy: TSortBy | undefined;
  sortOrder: 'ASC' | 'DESC' | undefined;
  field: TSortBy;
  onSort: (nextSortBy: TSortBy, nextSortOrder: 'ASC' | 'DESC') => void;
}

export function SortableHeader<TSortBy extends string>({
  label,
  sortBy,
  sortOrder,
  field,
  onSort,
}: SortableHeaderProps<TSortBy>) {
  const isSorted = sortBy === field;
  const nextOrder: 'ASC' | 'DESC' = isSorted && sortOrder === 'ASC' ? 'DESC' : 'ASC';

  return (
    <button type="button" onClick={() => onSort(field, nextOrder)} className="verseau-sortable-header">
      {label}
      {isSorted && (
        <span className={fr.cx(sortOrder === 'ASC' ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line')} />
      )}
    </button>
  );
}
