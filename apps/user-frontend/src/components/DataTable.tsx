/**
 * DataTable Component (Legacy)
 *
 * Wrapper around ResponsiveDataGrid for backward compatibility.
 * New code should use ResponsiveDataGrid directly with ResponsiveColumn types.
 */

import ResponsiveDataGrid, { ResponsiveColumn } from './ResponsiveDataGrid';

interface DataTableProps {
  rows: any[];
  columns: ResponsiveColumn[];
  getRowId?: (row: any) => any;
  loading?: boolean;
}

export default function DataTable({ rows, columns, getRowId, loading }: DataTableProps) {
  return (
    <ResponsiveDataGrid
      rows={rows}
      columns={columns}
      getRowId={getRowId}
      loading={loading}
      autoHeight
    />
  );
}
