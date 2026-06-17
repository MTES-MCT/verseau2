import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import { Table } from '@codegouvfr/react-dsfr/Table';
import './FixedHeightTable.css';

type TableProps = ComponentProps<typeof Table>;

type FixedHeightTableRowHeight = 'one-line' | 'two-lines' | 'three-lines';
type FixedHeightTableHeaderWithWidth = { key: ReactNode; width: number };
type FixedHeightTableHeader = ReactNode[] | FixedHeightTableHeaderWithWidth[];

interface FixedHeightTableProps extends Omit<TableProps, 'data' | 'headers'> {
  data: ReactNode[][];
  headers: FixedHeightTableHeader;
  isFetching?: boolean;
  pageSize: number;
  rowHeight: FixedHeightTableRowHeight;
  headerHeight?: FixedHeightTableRowHeight;
}

const ROW_HEIGHT_REM: Record<FixedHeightTableRowHeight, number> = {
  'one-line': 3.5,
  'two-lines': 5,
  'three-lines': 7.5,
};
const COLUMN_WIDTH_FRACTIONS = 100;

function isHeaderWithWidth(
  header: ReactNode | FixedHeightTableHeaderWithWidth,
): header is FixedHeightTableHeaderWithWidth {
  return typeof header === 'object' && header !== null && 'key' in header && 'width' in header;
}

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

function wrapHeader(header: ReactNode, headerIndex: number): ReactNode {
  if (typeof header !== 'string' && typeof header !== 'number') {
    return header;
  }

  const title = String(header);

  return (
    <span key={`fixed-table-header-${headerIndex}`} className="fixed-height-table__header-content" title={title}>
      {title}
    </span>
  );
}

export function FixedHeightTable({
  data,
  headers,
  isFetching = false,
  pageSize,
  rowHeight,
  headerHeight,
  className,
  style,
  ...tableProps
}: FixedHeightTableProps) {
  const rowHeightRem = ROW_HEIGHT_REM[rowHeight];
  const minHeightRem = ROW_HEIGHT_REM[headerHeight ?? 'one-line'] + pageSize * rowHeightRem;
  const columnWidthStyle = headers.reduce<Record<string, string>>((acc, header, headerIndex) => {
    if (isHeaderWithWidth(header)) {
      acc[`--fixed-height-table-column-${headerIndex + 1}-width`] = `${(header.width / COLUMN_WIDTH_FRACTIONS) * 100}%`;
    }

    return acc;
  }, {});
  const hasColumnWidths = Object.keys(columnWidthStyle).length > 0;
  const wrappedHeaders = headers.map((header, headerIndex) =>
    wrapHeader(isHeaderWithWidth(header) ? header.key : header, headerIndex),
  );
  const wrappedData = data.map((row, rowIndex) => row.map((cell, cellIndex) => wrapCell(cell, rowIndex, cellIndex)));
  const fixedTableStyle = {
    '--fixed-height-table-header-height': `${ROW_HEIGHT_REM[headerHeight ?? 'one-line']}rem`,
    '--fixed-height-table-min-height': `${minHeightRem}rem`,
    '--fixed-height-table-row-height': `${rowHeightRem}rem`,
    ...columnWidthStyle,
  } as CSSProperties;
  const fixedTableClassName = [
    'fixed-height-table',
    `fixed-height-table--${rowHeight}`,
    hasColumnWidths && 'fixed-height-table--with-column-widths',
    isFetching && 'fixed-height-table--fetching',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={fixedTableClassName} style={{ ...style, ...fixedTableStyle }}>
      <Table {...tableProps} data={wrappedData} headers={wrappedHeaders} />
      {isFetching && (
        <div className="fixed-height-table__overlay">
          <span className="fixed-height-table__spinner" />
        </div>
      )}
    </div>
  );
}
