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
  onUpdate?: (forecastId: string, field: string, value: any) => void;
  onBatchUpdate?: (forecastId: string, updates: Record<string, any>) => void;
  onAddRow?: () => void;
}

export const LiveForecastsTable = ({
  data,
  onEdit,
  onDelete,
  onSubmitForApproval,
  onUpdate,
  onBatchUpdate,
  onAddRow
}: LiveForecastsTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);

  const handleCellClick = (rowId: string, columnId: string) => {
    setEditingCell({ rowId, columnId });
  };

  const handleCellBlur = (rowId: string, columnId: string, value: string, originalValue: any) => {
    setEditingCell(null);

    // Only update if value has changed
    const numValue = parseFloat(value);

    // Special handling for yearlySum: distribute evenly across all months
    if (columnId === 'yearlySum' && !isNaN(numValue) && numValue !== originalValue) {
      const monthlyValue = numValue / 12;
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

      // Build batch update object
      const updates: Record<string, any> = {};
      months.forEach(month => {
        updates[month] = monthlyValue;
      });
      updates.yearlySum = numValue;

      // Use batch update if available, otherwise fall back to multiple updates
      if (onBatchUpdate) {
        onBatchUpdate(rowId, updates);
      } else if (onUpdate) {
        months.forEach(month => {
          onUpdate(rowId, month, monthlyValue);
        });
      }
    } else if (!isNaN(numValue) && numValue !== originalValue && onUpdate) {
      onUpdate(rowId, columnId, numValue);
    } else if (value !== originalValue && onUpdate) {
      onUpdate(rowId, columnId, value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowId: string, columnId: string, value: string, originalValue: any) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const renderEditableCell = (info: any, columnId: string, isNumeric = true) => {
    const rowId = info.row.original.id;
    const value = info.getValue();
    const isEditing = editingCell?.rowId === rowId && editingCell?.columnId === columnId;

    if (isEditing) {
      return (
        <input
          type={isNumeric ? 'number' : 'text'}
          defaultValue={value}
          autoFocus
          onBlur={(e) => handleCellBlur(rowId, columnId, e.target.value, value)}
          onKeyDown={(e) => handleKeyDown(e, rowId, columnId, e.currentTarget.value, value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '2px solid #0969da',
            borderRadius: '2px',
            fontSize: '13px',
            fontFamily: isNumeric ? "'Consolas', 'Monaco', monospace" : 'inherit',
            textAlign: isNumeric ? 'right' : 'left',
            outline: 'none'
          }}
        />
      );
    }

    return (
      <div
        className={`cell-content ${isNumeric ? 'cell-number' : ''}`}
        onClick={() => onUpdate && handleCellClick(rowId, columnId)}
        style={{ cursor: onUpdate ? 'pointer' : 'default' }}
        title={onUpdate ? 'Click to edit' : ''}
      >
        {isNumeric && typeof value === 'number'
          ? value.toLocaleString('nb-NO', { minimumFractionDigits: 0 })
          : (value || '-')}
      </div>
    );
  };

  const columns = useMemo<ColumnDef<Forecast>[]>(
    () => [
      {
        accessorKey: 'projectName',
        header: 'PROJECT NAME',
        size: 130,
        cell: (info) => renderEditableCell(info, 'projectName', false),
      },
      {
        accessorKey: 'profitCenter',
        header: 'PROFIT CENTER',
        size: 100,
        cell: (info) => renderEditableCell(info, 'profitCenter', false),
      },
      {
        accessorKey: 'wbs',
        header: 'WBS',
        size: 90,
        cell: (info) => renderEditableCell(info, 'wbs', false),
      },
      {
        accessorKey: 'account',
        header: 'ACCOUNT',
        size: 90,
        cell: (info) => renderEditableCell(info, 'account', false),
      },
      {
        accessorKey: 'jan',
        header: 'JAN',
        size: 70,
        cell: (info) => renderEditableCell(info, 'jan', true),
      },
      {
        accessorKey: 'feb',
        header: 'FEB',
        size: 70,
        cell: (info) => renderEditableCell(info, 'feb', true),
      },
      {
        accessorKey: 'mar',
        header: 'MAR',
        size: 70,
        cell: (info) => renderEditableCell(info, 'mar', true),
      },
      {
        accessorKey: 'apr',
        header: 'APR',
        size: 70,
        cell: (info) => renderEditableCell(info, 'apr', true),
      },
      {
        accessorKey: 'may',
        header: 'MAY',
        size: 70,
        cell: (info) => renderEditableCell(info, 'may', true),
      },
      {
        accessorKey: 'jun',
        header: 'JUN',
        size: 70,
        cell: (info) => renderEditableCell(info, 'jun', true),
      },
      {
        accessorKey: 'jul',
        header: 'JUL',
        size: 70,
        cell: (info) => renderEditableCell(info, 'jul', true),
      },
      {
        accessorKey: 'aug',
        header: 'AUG',
        size: 70,
        cell: (info) => renderEditableCell(info, 'aug', true),
      },
      {
        accessorKey: 'sep',
        header: 'SEP',
        size: 70,
        cell: (info) => renderEditableCell(info, 'sep', true),
      },
      {
        accessorKey: 'oct',
        header: 'OCT',
        size: 70,
        cell: (info) => renderEditableCell(info, 'oct', true),
      },
      {
        accessorKey: 'nov',
        header: 'NOV',
        size: 70,
        cell: (info) => renderEditableCell(info, 'nov', true),
      },
      {
        accessorKey: 'dec',
        header: 'DEC',
        size: 70,
        cell: (info) => renderEditableCell(info, 'dec', true),
      },
      {
        accessorKey: 'yearlySum',
        header: 'YEARLY SUM',
        size: 90,
        cell: (info) => {
          const rowId = info.row.original.id;
          const value = info.getValue();
          const isEditing = editingCell?.rowId === rowId && editingCell?.columnId === 'yearlySum';

          if (isEditing) {
            return (
              <input
                type="number"
                defaultValue={value as number}
                autoFocus
                onBlur={(e) => handleCellBlur(rowId, 'yearlySum', e.target.value, value)}
                onKeyDown={(e) => handleKeyDown(e, rowId, 'yearlySum', e.currentTarget.value, value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '2px solid #0969da',
                  borderRadius: '2px',
                  fontSize: '13px',
                  fontFamily: "'Consolas', 'Monaco', monospace",
                  textAlign: 'right',
                  outline: 'none',
                  fontWeight: 'bold'
                }}
              />
            );
          }

          return (
            <div
              className="cell-content cell-number"
              onClick={() => onUpdate && handleCellClick(rowId, 'yearlySum')}
              style={{ cursor: onUpdate ? 'pointer' : 'default' }}
              title={onUpdate ? 'Click to edit and distribute across months' : ''}
            >
              <strong>
                {(value as number).toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
              </strong>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'ACTIONS',
        size: 150,
        cell: (info) => (
          <div className="cell-content cell-actions">
            {onSubmitForApproval && (
              <button
                className="action-btn action-btn-submit"
                onClick={() => onSubmitForApproval(info.row.original.id)}
                style={{ backgroundColor: '#0969da', color: 'white' }}
              >
                Submit
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
    [onEdit, onDelete, onSubmitForApproval, onUpdate, onBatchUpdate, editingCell]
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
            {onAddRow && (
              <tr className="add-row" onClick={onAddRow}>
                <td style={{ width: 130 }}>
                  <div className="cell-content placeholder-cell">Project Name</div>
                </td>
                <td style={{ width: 100 }}>
                  <div className="cell-content placeholder-cell">Profit Center</div>
                </td>
                <td style={{ width: 90 }}>
                  <div className="cell-content placeholder-cell">WBS</div>
                </td>
                <td style={{ width: 90 }}>
                  <div className="cell-content placeholder-cell">Account</div>
                </td>
                <td style={{ width: 70 }}>
                  <div className="cell-content cell-number placeholder-cell">0</div>
                </td>
                <td style={{ width: 70 }}>
                  <div className="cell-content cell-number placeholder-cell">0</div>
                </td>
                <td style={{ width: 70 }}>
                  <div className="cell-content cell-number placeholder-cell">0</div>
                </td>
                <td style={{ width: 70 }}>
                  <div className="cell-content cell-number placeholder-cell">0</div>
                </td>
                <td style={{ width: 70 }}>
                  <div className="cell-content cell-number placeholder-cell">0</div>
                </td>
                <td style={{ width: 70 }}>
                  <div className="cell-content cell-number placeholder-cell">0</div>
                </td>
                <td style={{ width: 70 }}>
                  <div className="cell-content cell-number placeholder-cell">0</div>
                </td>
                <td style={{ width: 70 }}>
                  <div className="cell-content cell-number placeholder-cell">0</div>
                </td>
                <td style={{ width: 70 }}>
                  <div className="cell-content cell-number placeholder-cell">0</div>
                </td>
                <td style={{ width: 70 }}>
                  <div className="cell-content cell-number placeholder-cell">0</div>
                </td>
                <td style={{ width: 70 }}>
                  <div className="cell-content cell-number placeholder-cell">0</div>
                </td>
                <td style={{ width: 70 }}>
                  <div className="cell-content cell-number placeholder-cell">0</div>
                </td>
                <td style={{ width: 90 }}>
                  <div className="cell-content cell-number placeholder-cell">0</div>
                </td>
                <td style={{ width: 150 }}>
                  <div className="cell-content placeholder-cell">Click to add</div>
                </td>
              </tr>
            )}
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
