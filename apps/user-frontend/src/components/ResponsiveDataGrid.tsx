/**
 * Responsive DataGrid Component
 *
 * Adaptive grid that adjusts columns based on screen size using priority system.
 * - Mobile (<600px): Only 'high' priority columns
 * - Tablet (600-900px): 'high' + 'medium' priority columns
 * - Desktop (>900px): All columns
 */

import React from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useTheme, useMediaQuery, Box } from '@mui/material';

/**
 * Extended column definition with responsive priority
 */
export interface ResponsiveColumn extends GridColDef {
  /**
   * Priority determines visibility on different screen sizes:
   * - high: Always visible (mobile, tablet, desktop)
   * - medium: Hidden on mobile (<600px), visible on tablet+
   * - low: Hidden on mobile + small tablets, visible on desktop (>1200px)
   */
  priority?: 'high' | 'medium' | 'low';
}

interface ResponsiveDataGridProps {
  rows: any[];
  columns: ResponsiveColumn[];
  getRowId?: (row: any) => any;
  loading?: boolean;
  autoHeight?: boolean;
  pageSize?: number;
}

export default function ResponsiveDataGrid({
  rows,
  columns,
  getRowId,
  loading = false,
  autoHeight = true,
  pageSize = 50,
}: ResponsiveDataGridProps) {
  const theme = useTheme();

  // Breakpoint detection
  const isXs = useMediaQuery(theme.breakpoints.down('sm')); // <600px (mobile)
  const isSm = useMediaQuery(theme.breakpoints.down('md')); // <900px (tablet portrait)
  const isMd = useMediaQuery(theme.breakpoints.down('lg')); // <1200px (tablet landscape)

  // Filter columns based on screen size and priority
  const visibleColumns = columns.filter((col) => {
    const priority = col.priority || 'medium'; // Default to medium if not specified

    if (isXs) {
      // Mobile: only high priority
      return priority === 'high';
    } else if (isSm) {
      // Tablet portrait: high + medium
      return priority === 'high' || priority === 'medium';
    } else if (isMd) {
      // Tablet landscape: all except some low (keep most)
      return true;
    }

    // Desktop: show all columns
    return true;
  });

  return (
    <Box sx={{ width: '100%' }}>
      <DataGrid
        rows={rows}
        columns={visibleColumns}
        getRowId={getRowId || ((r) => r.id || r.code || r.description)}
        loading={loading}
        autoHeight={autoHeight}
        pageSizeOptions={[25, 50, 100]}
        aria-label="Data table"
        initialState={{
          pagination: {
            paginationModel: { pageSize, page: 0 },
          },
        }}
        density="compact"
        disableRowSelectionOnClick
        sx={{
          '& .MuiDataGrid-root': {
            border: 'none',
          },
          // Adaptive font sizes
          fontSize: isXs ? '0.75rem' : '0.875rem',

          // Ensure columns fill space on mobile
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
            fontSize: isXs ? '0.7rem' : '0.875rem',
          },

          // Responsive cell padding
          '& .MuiDataGrid-cell': {
            padding: isXs ? '8px 4px' : '8px 16px',
          },

          // Better touch targets on mobile
          '& .MuiDataGrid-row': {
            minHeight: isXs ? '48px' : '36px',
          },
        }}
        // Disable column menu on mobile for simpler UX
        disableColumnMenu={isXs}

        // Hide footer row count on mobile to save space
        hideFooterSelectedRowCount={isXs}
      />
    </Box>
  );
}
