import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  getExpandedRowModel,
  type ExpandedState,
} from '@tanstack/react-table';
import { type ForecastSnapshot } from '../../utils/mockData';
import './ForecastsTable.css';

interface SnapshotsTableProps {
  data: ForecastSnapshot[];
  onApprove?: (snapshotId: string) => void;
  onDelete?: (snapshotId: string) => void;
}

interface BatchedSnapshot {
  id: string;
  batchId: string;
  snapshotDate: string;
  submittedBy: string;
  forecastCount: number;
  allApproved: boolean;
  forecasts: ForecastSnapshot[];
}

export const SnapshotsTable = ({ data, onApprove, onDelete }: SnapshotsTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  // Group snapshots by batch_id
  const batchedData = useMemo<BatchedSnapshot[]>(() => {
    const batches = new Map<string, ForecastSnapshot[]>();

    data.forEach(snapshot => {
      const existing = batches.get(snapshot.batchId) || [];
      batches.set(snapshot.batchId, [...existing, snapshot]);
    });

    return Array.from(batches.entries()).map(([batchId, forecasts]) => {
      // Sort forecasts within batch by project name
      const sortedForecasts = [...forecasts].sort((a, b) =>
        a.projectName.localeCompare(b.projectName)
      );

      return {
        id: batchId,
        batchId,
        snapshotDate: forecasts[0].snapshotDate,
        submittedBy: forecasts[0].submittedBy,
        forecastCount: forecasts.length,
        allApproved: forecasts.every(f => f.isApproved),
        forecasts: sortedForecasts,
      };
    }).sort((a, b) =>
      // Sort batches by date, most recent first
      new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime()
    );
  }, [data]);

  const columns = useMemo<ColumnDef<BatchedSnapshot>[]>(
    () => [
      {
        id: 'expander',
        header: '',
        size: 40,
        cell: ({ row }) => (
          <div className="cell-content" style={{ textAlign: 'center' }}>
            <button
              onClick={() => row.toggleExpanded()}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '4px 8px',
              }}
            >
              {row.getIsExpanded() ? '▼' : '▶'}
            </button>
          </div>
        ),
      },
      {
        accessorKey: 'snapshotDate',
        header: 'SUBMISSION DATE',
        size: 200,
        cell: (info) => (
          <div className="cell-content">
            <strong>{new Date(info.getValue() as string).toLocaleString('nb-NO')}</strong>
          </div>
        ),
      },
      {
        accessorKey: 'forecastCount',
        header: 'FORECASTS',
        size: 100,
        cell: (info) => (
          <div className="cell-content" style={{ textAlign: 'center' }}>
            <span style={{
              padding: '4px 12px',
              borderRadius: '12px',
              backgroundColor: '#e6f4ff',
              color: '#0958d9',
              fontWeight: 'bold',
            }}>
              {info.getValue() as number}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'submittedBy',
        header: 'SUBMITTED BY',
        size: 150,
        cell: (info) => <div className="cell-content">{info.getValue() as string}</div>,
      },
      {
        accessorKey: 'allApproved',
        header: 'STATUS',
        size: 150,
        cell: (info) => (
          <div className="cell-content">
            <span
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                fontWeight: 'bold',
                backgroundColor: info.getValue() ? '#1a7f37' : '#f59e0b',
                color: 'white',
              }}
            >
              {info.getValue() ? 'All Approved' : 'Pending Approval'}
            </span>
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'ACTIONS',
        size: 100,
        cell: (info) => {
          const batch = info.row.original;
          const hasUnapproved = batch.forecasts.some(f => !f.isApproved);

          return (
            <div className="cell-content cell-actions">
              {onApprove && hasUnapproved && (
                <button
                  className="action-btn action-btn-submit"
                  onClick={() => {
                    // Approve all unapproved forecasts in this batch
                    batch.forecasts.forEach(f => {
                      if (!f.isApproved) {
                        onApprove(f.id);
                      }
                    });
                  }}
                  style={{ backgroundColor: '#1a7f37', color: 'white' }}
                >
                  Approve All
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [onApprove]
  );

  const table = useReactTable({
    data: batchedData,
    columns,
    state: {
      sorting,
      expanded,
    },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  if (data.length === 0) {
    return (
      <div className="excel-table-container">
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
          <div>No submitted forecasts yet</div>
        </div>
      </div>
    );
  }

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
              <>
                <tr key={row.id} style={{ backgroundColor: row.getIsExpanded() ? '#f0f7ff' : 'transparent' }}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} style={{ width: cell.column.getSize() }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {row.getIsExpanded() && (
                  <tr key={`${row.id}-expanded`}>
                    <td colSpan={columns.length} style={{ padding: 0, backgroundColor: '#fafafa' }}>
                      <div style={{ padding: '16px 24px' }}>
                        <h4 style={{ marginBottom: '12px', color: '#666' }}>
                          Forecasts in this submission ({row.original.forecastCount}):
                        </h4>
                        <table className="excel-table" style={{ fontSize: '12px' }}>
                          <thead>
                            <tr>
                              <th style={{ width: 150 }}>PROJECT NAME</th>
                              <th style={{ width: 100 }}>PROFIT CENTER</th>
                              <th style={{ width: 90 }}>WBS</th>
                              <th style={{ width: 90 }}>ACCOUNT</th>
                              <th style={{ width: 70 }}>JAN</th>
                              <th style={{ width: 70 }}>FEB</th>
                              <th style={{ width: 70 }}>MAR</th>
                              <th style={{ width: 70 }}>APR</th>
                              <th style={{ width: 70 }}>MAY</th>
                              <th style={{ width: 70 }}>JUN</th>
                              <th style={{ width: 70 }}>JUL</th>
                              <th style={{ width: 70 }}>AUG</th>
                              <th style={{ width: 70 }}>SEP</th>
                              <th style={{ width: 70 }}>OCT</th>
                              <th style={{ width: 70 }}>NOV</th>
                              <th style={{ width: 70 }}>DEC</th>
                              <th style={{ width: 100 }}>YEARLY SUM</th>
                              <th style={{ width: 110 }}>STATUS</th>
                              <th style={{ width: 100 }}>ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {row.original.forecasts.map((forecast) => (
                              <tr key={forecast.id}>
                                <td style={{ width: 150 }}>
                                  <div className="cell-content">{forecast.projectName}</div>
                                </td>
                                <td style={{ width: 100 }}>
                                  <div className="cell-content">{forecast.profitCenter}</div>
                                </td>
                                <td style={{ width: 90 }}>
                                  <div className="cell-content">{forecast.wbs}</div>
                                </td>
                                <td style={{ width: 90 }}>
                                  <div className="cell-content">{forecast.account}</div>
                                </td>
                                <td style={{ width: 70 }}>
                                  <div className="cell-content cell-number">
                                    {forecast.jan.toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
                                  </div>
                                </td>
                                <td style={{ width: 70 }}>
                                  <div className="cell-content cell-number">
                                    {forecast.feb.toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
                                  </div>
                                </td>
                                <td style={{ width: 70 }}>
                                  <div className="cell-content cell-number">
                                    {forecast.mar.toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
                                  </div>
                                </td>
                                <td style={{ width: 70 }}>
                                  <div className="cell-content cell-number">
                                    {forecast.apr.toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
                                  </div>
                                </td>
                                <td style={{ width: 70 }}>
                                  <div className="cell-content cell-number">
                                    {forecast.may.toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
                                  </div>
                                </td>
                                <td style={{ width: 70 }}>
                                  <div className="cell-content cell-number">
                                    {forecast.jun.toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
                                  </div>
                                </td>
                                <td style={{ width: 70 }}>
                                  <div className="cell-content cell-number">
                                    {forecast.jul.toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
                                  </div>
                                </td>
                                <td style={{ width: 70 }}>
                                  <div className="cell-content cell-number">
                                    {forecast.aug.toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
                                  </div>
                                </td>
                                <td style={{ width: 70 }}>
                                  <div className="cell-content cell-number">
                                    {forecast.sep.toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
                                  </div>
                                </td>
                                <td style={{ width: 70 }}>
                                  <div className="cell-content cell-number">
                                    {forecast.oct.toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
                                  </div>
                                </td>
                                <td style={{ width: 70 }}>
                                  <div className="cell-content cell-number">
                                    {forecast.nov.toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
                                  </div>
                                </td>
                                <td style={{ width: 70 }}>
                                  <div className="cell-content cell-number">
                                    {forecast.dec.toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
                                  </div>
                                </td>
                                <td style={{ width: 100 }}>
                                  <div className="cell-content cell-number">
                                    <strong>
                                      {forecast.yearlySum.toLocaleString('nb-NO', { minimumFractionDigits: 0 })}
                                    </strong>
                                  </div>
                                </td>
                                <td style={{ width: 110 }}>
                                  <div className="cell-content">
                                    <span
                                      style={{
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        backgroundColor: forecast.isApproved ? '#1a7f37' : '#f59e0b',
                                        color: 'white',
                                      }}
                                    >
                                      {forecast.isApproved ? 'Approved' : 'Pending'}
                                    </span>
                                  </div>
                                </td>
                                <td style={{ width: 100 }}>
                                  <div className="cell-content cell-actions">
                                    {onApprove && !forecast.isApproved && (
                                      <button
                                        className="action-btn action-btn-submit"
                                        onClick={() => onApprove(forecast.id)}
                                        style={{
                                          backgroundColor: '#1a7f37',
                                          color: 'white',
                                          fontSize: '11px',
                                          padding: '4px 8px'
                                        }}
                                      >
                                        Approve
                                      </button>
                                    )}
                                    {onDelete && (
                                      <button
                                        className="action-btn action-btn-delete"
                                        onClick={() => onDelete(forecast.id)}
                                        style={{ fontSize: '11px', padding: '4px 8px' }}
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
