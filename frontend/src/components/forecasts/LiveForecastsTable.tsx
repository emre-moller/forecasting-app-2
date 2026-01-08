import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { type Forecast } from '../../utils/mockData';
import './ForecastsTable.css';

interface LiveForecastsTableProps {
  data: Forecast[];
  onEdit?: (forecast: Forecast) => void;
  onDelete?: (forecastId: string) => void;
  onSubmitForApproval?: (forecastId: string) => void;
}

export const LiveForecastsTable = ({
  data,
  onEdit,
  onDelete,
  onSubmitForApproval
}: LiveForecastsTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<Forecast>[]>(
    () => [
      {
        accessorKey: 'projectName',
        header: 'PROJECT NAME',
        size: 200,
        cell: (info) => <div className="cell-content">{info.getValue() as string || '-'}</div>,
      },
      {
        accessorKey: 'profitCenter',
        header: 'PROFIT CENTER',
        size: 150,
        cell: (info) => <div className="cell-content">{info.getValue() as string || '-'}</div>,
      },
      {
        accessorKey: 'wbs',
        header: 'WBS',
        size: 120,
        cell: (info) => <div className="cell-content">{info.getValue() as string || '-'}</div>,
      },
      {
        accessorKey: 'account',
        header: 'ACCOUNT',
        size: 120,
        cell: (info) => <div className="cell-content">{info.getValue() as string || '-'}</div>,
      },
      {
        accessorKey: 'jan',
        header: 'JAN',
        size: 100,
        cell: (info) => (
          <div className="cell-content cell-number">
            {(info.getValue() as number).toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
          </div>
        ),
      },
      {
        accessorKey: 'feb',
        header: 'FEB',
        size: 100,
        cell: (info) => (
          <div className="cell-content cell-number">
            {(info.getValue() as number).toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
          </div>
        ),
      },
      {
        accessorKey: 'mar',
        header: 'MAR',
        size: 100,
        cell: (info) => (
          <div className="cell-content cell-number">
            {(info.getValue() as number).toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
          </div>
        ),
      },
      {
        accessorKey: 'apr',
        header: 'APR',
        size: 100,
        cell: (info) => (
          <div className="cell-content cell-number">
            {(info.getValue() as number).toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
          </div>
        ),
      },
      {
        accessorKey: 'may',
        header: 'MAY',
        size: 100,
        cell: (info) => (
          <div className="cell-content cell-number">
            {(info.getValue() as number).toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
          </div>
        ),
      },
      {
        accessorKey: 'jun',
        header: 'JUN',
        size: 100,
        cell: (info) => (
          <div className="cell-content cell-number">
            {(info.getValue() as number).toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
          </div>
        ),
      },
      {
        accessorKey: 'jul',
        header: 'JUL',
        size: 100,
        cell: (info) => (
          <div className="cell-content cell-number">
            {(info.getValue() as number).toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
          </div>
        ),
      },
      {
        accessorKey: 'aug',
        header: 'AUG',
        size: 100,
        cell: (info) => (
          <div className="cell-content cell-number">
            {(info.getValue() as number).toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
          </div>
        ),
      },
      {
        accessorKey: 'sep',
        header: 'SEP',
        size: 100,
        cell: (info) => (
          <div className="cell-content cell-number">
            {(info.getValue() as number).toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
          </div>
        ),
      },
      {
        accessorKey: 'oct',
        header: 'OCT',
        size: 100,
        cell: (info) => (
          <div className="cell-content cell-number">
            {(info.getValue() as number).toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
          </div>
        ),
      },
      {
        accessorKey: 'nov',
        header: 'NOV',
        size: 100,
        cell: (info) => (
          <div className="cell-content cell-number">
            {(info.getValue() as number).toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
          </div>
        ),
      },
      {
        accessorKey: 'dec',
        header: 'DEC',
        size: 100,
        cell: (info) => (
          <div className="cell-content cell-number">
            {(info.getValue() as number).toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
          </div>
        ),
      },
      {
        accessorKey: 'total',
        header: 'TOTAL',
        size: 120,
        cell: (info) => (
          <div className="cell-content cell-number">
            <strong>
              {(info.getValue() as number).toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
            </strong>
          </div>
        ),
      },
      {
        accessorKey: 'yearlySum',
        header: 'YEARLY SUM',
        size: 120,
        cell: (info) => (
          <div className="cell-content cell-number">
            <strong>
              {(info.getValue() as number).toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
            </strong>
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'ACTIONS',
        size: 200,
        cell: (info) => (
          <div className="cell-content cell-actions">
            {onEdit && (
              <button
                className="action-btn action-btn-edit"
                onClick={() => onEdit(info.row.original)}
              >
                Edit
              </button>
            )}
            {onSubmitForApproval && (
              <button
                className="action-btn action-btn-submit"
                onClick={() => onSubmitForApproval(info.row.original.id)}
                style={{ backgroundColor: '#0969da', color: 'white' }}
              >
                Submit for Approval
              </button>
            )}
            {onDelete && (
              <button
                className="action-btn action-btn-delete"
                onClick={() => onDelete(info.row.original.id)}
              >
                Delete
              </button>
            )}
          </div>
        ),
      },
    ],
    [onEdit, onDelete, onSubmitForApproval]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="excel-table-container">
      <div className="excel-table-wrapper">
        <table className="excel-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className={header.column.getCanSort() ? 'sortable' : ''}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="header-content">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() && (
                        <span className="sort-indicator">
                          {header.column.getIsSorted() === 'asc' ? ' ▲' : ' ▼'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} style={{ width: cell.column.getSize() }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
