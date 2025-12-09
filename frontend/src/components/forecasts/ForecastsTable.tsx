import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import { Forecast, departments, projects } from '../../utils/mockData';
import './ForecastsTable.css';

interface ForecastsTableProps {
  data: Forecast[];
  onEdit?: (forecast: Forecast) => void;
  onDelete?: (forecastId: string) => void;
}

export const ForecastsTable = ({ data, onEdit, onDelete }: ForecastsTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<Forecast>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        size: 80,
        cell: (info) => <div className="cell-content">{info.getValue() as string}</div>,
      },
      {
        accessorKey: 'departmentId',
        header: 'Department',
        size: 150,
        cell: (info) => {
          const dept = departments.find((d) => d.id === info.getValue());
          return <div className="cell-content">{dept?.name || '-'}</div>;
        },
      },
      {
        accessorKey: 'projectId',
        header: 'Project',
        size: 200,
        cell: (info) => {
          const proj = projects.find((p) => p.id === info.getValue());
          return <div className="cell-content">{proj?.name || '-'}</div>;
        },
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        size: 130,
        cell: (info) => (
          <div className="cell-content cell-number">
            ${(info.getValue() as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        ),
      },
      {
        accessorKey: 'timePeriod',
        header: 'Time Period',
        size: 120,
        cell: (info) => <div className="cell-content">{info.getValue() as string}</div>,
      },
      {
        accessorKey: 'periodType',
        header: 'Period Type',
        size: 120,
        cell: (info) => (
          <div className="cell-content cell-capitalize">{info.getValue() as string}</div>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Description',
        size: 300,
        cell: (info) => <div className="cell-content">{info.getValue() as string}</div>,
      },
      {
        accessorKey: 'createdBy',
        header: 'Created By',
        size: 130,
        cell: (info) => <div className="cell-content">{info.getValue() as string}</div>,
      },
      {
        accessorKey: 'createdAt',
        header: 'Created At',
        size: 110,
        cell: (info) => <div className="cell-content">{info.getValue() as string}</div>,
      },
      {
        id: 'actions',
        header: 'Actions',
        size: 120,
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
    [onEdit, onDelete]
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

  const totalAmount = useMemo(() => {
    return data.reduce((sum, forecast) => sum + forecast.amount, 0);
  }, [data]);

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
          <tfoot>
            <tr className="total-row">
              <td colSpan={3}>
                <div className="cell-content cell-total-label">
                  <strong>TOTAL ({data.length} records)</strong>
                </div>
              </td>
              <td>
                <div className="cell-content cell-number">
                  <strong>
                    ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </td>
              <td colSpan={6}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
