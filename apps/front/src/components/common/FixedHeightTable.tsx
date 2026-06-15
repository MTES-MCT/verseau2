import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import { Table } from '@codegouvfr/react-dsfr/Table';
import './FixedHeightTable.css';

type TableProps = ComponentProps<typeof Table>;

type FixedHeightTableRowHeight = 'one-line' | 'two-lines';

interface FixedHeightTableProps extends Omit<TableProps, 'data'> {
  data: ReactNode[][];
  pageSize: number;
  rowHeight: FixedHeightTableRowHeight;
}

const HEADER_HEIGHT_REM = 3.5;
const ROW_HEIGHT_REM: Record<FixedHeightTableRowHeight, number> = {
  'one-line': 3.5,
  'two-lines': 5,
};

function wrapCell(cell: ReactNode, rowIndex: number, cellIndex: number): ReactNode {
  if (typeof cell !== 'string' && typeof cell !== 'number') {
    return cell;
  }

  const label = String(cell);

  return (
    <span key={`fixed-table-cell-${rowIndex}-${cellIndex}`} className="fixed-height-table__cell-content" title={label}>
      {label}
    </span>
  );
}

export function FixedHeightTable({ data, pageSize, rowHeight, className, ...tableProps }: FixedHeightTableProps) {
  const rowHeightRem = ROW_HEIGHT_REM[rowHeight];
  const minHeightRem = HEADER_HEIGHT_REM + pageSize * rowHeightRem;
  const wrappedData = data.map((row, rowIndex) => row.map((cell, cellIndex) => wrapCell(cell, rowIndex, cellIndex)));
  const fixedTableStyle = {
    '--fixed-height-table-min-height': `${minHeightRem}rem`,
    '--fixed-height-table-row-height': `${rowHeightRem}rem`,
  } as CSSProperties;
  const fixedTableClassName = ['fixed-height-table', `fixed-height-table--${rowHeight}`, className]
    .filter(Boolean)
    .join(' ');

  return <Table {...tableProps} className={fixedTableClassName} data={wrappedData} style={fixedTableStyle} />;
}
