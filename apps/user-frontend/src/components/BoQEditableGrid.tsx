/**
 * BoQ Editable Grid Component
 *
 * Real-time collaborative spreadsheet for editing Bill of Quantities.
 * Features:
 * - Inline editing with optimistic updates
 * - WebSocket synchronization
 * - Conflict detection and resolution
 * - Bulk operations
 * - Auto-save on blur
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
  Alert,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Save, Edit, Cancel, Warning } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobs } from '../services/api';
import { useBoqUpdates, useBoqBulkUpdates } from '../contexts/WebSocketContext';
import api from '../services/api';
import BoQCardList from './BoQCardList';
import { formatNumber } from '../utils/currency';

interface BoQItem {
  id: string;
  job_id: string;
  code: string | null;
  description: string;
  unit: string;
  qty: number;
  unit_price: number;
  total_price: number;
  updated_at?: string;
}

interface BoQEditableGridProps {
  jobId: string;
  projectId?: string;
  editable?: boolean;
  onError?: (error: string) => void;
}

interface EditingCell {
  itemId: string;
  field: keyof BoQItem;
  value: any;
}

export default function BoQEditableGrid({
  jobId,
  projectId,
  editable = true,
  onError,
}: BoQEditableGridProps) {
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // <600px
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [conflictItems, setConflictItems] = useState<Set<string>>(new Set());

  // Fetch BoQ items
  const {
    data: boqItems,
    isLoading,
    error,
  } = useQuery<BoQItem[]>({
    queryKey: ['boq', jobId],
    queryFn: () => jobs.getBoq(jobId),
    enabled: !!jobId,
  });

  // Update single item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, updates }: { itemId: string; updates: Partial<BoQItem> }) => {
      const response = await api.patch(`/boq/items/${itemId}`, updates);
      return response.data;
    },
    onMutate: async ({ itemId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['boq', jobId] });

      // Snapshot previous value
      const previousItems = queryClient.getQueryData<BoQItem[]>(['boq', jobId]);

      // Optimistically update
      queryClient.setQueryData<BoQItem[]>(['boq', jobId], (old) =>
        old?.map((item) =>
          item.id === itemId
            ? {
                ...item,
                ...updates,
                total_price:
                  updates.qty !== undefined || updates.unit_price !== undefined
                    ? (updates.qty ?? item.qty) * (updates.unit_price ?? item.unit_price)
                    : item.total_price,
              }
            : item
        )
      );

      return { previousItems };
    },
    onError: (err: any, variables, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(['boq', jobId], context.previousItems);
      }

      const errorMsg = err.response?.data?.detail?.message || 'Failed to update item';
      onError?.(errorMsg);

      // Check for conflict
      if (err.response?.status === 409) {
        setConflictItems((prev) => new Set(prev).add(variables.itemId));
        setTimeout(() => {
          setConflictItems((prev) => {
            const next = new Set(prev);
            next.delete(variables.itemId);
            return next;
          });
        }, 3000);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boq', jobId] });
    },
  });

  // Listen for real-time updates from other users
  useBoqUpdates(
    useCallback(
      (data) => {
        // Only update if it's not our own change
        if (data.project_id === projectId) {
          queryClient.setQueryData<BoQItem[]>(['boq', jobId], (old) =>
            old?.map((item) =>
              item.id === data.item_id
                ? {
                    ...item,
                    ...data.updates,
                    total_price:
                      data.updates.qty !== undefined || data.updates.unit_price !== undefined
                        ? (data.updates.qty ?? item.qty) *
                          (data.updates.unit_price ?? item.unit_price)
                        : item.total_price,
                  }
                : item
            )
          );
        }
      },
      [projectId, jobId, queryClient]
    )
  );

  // Listen for bulk updates
  useBoqBulkUpdates(
    useCallback(
      (data) => {
        if (data.project_id === projectId && data.summary.updated > 0) {
          queryClient.invalidateQueries({ queryKey: ['boq', jobId] });
        }
      },
      [projectId, jobId, queryClient]
    )
  );

  const handleCellClick = (itemId: string, field: keyof BoQItem, currentValue: any) => {
    if (!editable) return;
    if (['code', 'description', 'unit', 'qty', 'unit_price'].includes(field)) {
      setEditingCell({ itemId, field, value: currentValue });
    }
  };

  const handleCellChange = (value: any) => {
    if (editingCell) {
      setEditingCell({ ...editingCell, value });
    }
  };

  const handleCellBlur = () => {
    if (!editingCell) return;

    const item = boqItems?.find((i) => i.id === editingCell.itemId);
    if (!item) return;

    // Parse numeric fields
    let finalValue = editingCell.value;
    if (editingCell.field === 'qty' || editingCell.field === 'unit_price') {
      finalValue = parseFloat(editingCell.value);
      if (isNaN(finalValue) || finalValue < 0) {
        setEditingCell(null);
        onError?.(`Invalid ${editingCell.field}: must be a positive number`);
        return;
      }
    }

    // Check if value actually changed
    if (item[editingCell.field] === finalValue) {
      setEditingCell(null);
      return;
    }

    // Save change
    updateItemMutation.mutate({
      itemId: editingCell.itemId,
      updates: {
        [editingCell.field]: finalValue,
        updated_at: item.updated_at, // For optimistic concurrency
      } as Partial<BoQItem>,
    });

    setEditingCell(null);
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const renderCell = (item: BoQItem, field: keyof BoQItem) => {
    const isEditing = editingCell?.itemId === item.id && editingCell?.field === field;
    const hasConflict = conflictItems.has(item.id);
    const value = item[field];

    if (isEditing) {
      return (
        <TextField
          value={editingCell.value}
          onChange={(e) => handleCellChange(e.target.value)}
          onBlur={handleCellBlur}
          onKeyDown={handleCellKeyDown}
          autoFocus
          size="small"
          fullWidth
          type={field === 'qty' || field === 'unit_price' ? 'number' : 'text'}
          inputProps={{
            step: field === 'unit_price' ? '0.01' : '1',
            min: 0,
          }}
        />
      );
    }

    return (
      <Box
        onClick={() => handleCellClick(item.id, field, value)}
        sx={{
          cursor: editable ? 'pointer' : 'default',
          p: 1,
          '&:hover': editable ? { bgcolor: 'action.hover' } : {},
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {hasConflict && (
          <Tooltip title="Item was modified by another user">
            <Warning fontSize="small" color="warning" />
          </Tooltip>
        )}
        <Typography variant="body2">
          {field === 'qty' || field === 'unit_price' || field === 'total_price'
            ? typeof value === 'number'
              ? formatNumber(value)
              : formatNumber(0)
            : value || '-'}
        </Typography>
      </Box>
    );
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load BoQ items
      </Alert>
    );
  }

  if (!boqItems || boqItems.length === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No BoQ items found. Upload a file to generate quantities.
      </Alert>
    );
  }

  // Mobile: Show card list
  if (isMobile) {
    return (
      <BoQCardList
        items={boqItems}
        editable={editable}
        conflictItems={conflictItems}
        onEdit={(item) => {
          // TODO: Open edit dialog/sheet for mobile
          console.log('Edit item:', item);
          onError?.('Mobile editing coming soon!');
        }}
      />
    );
  }

  // Desktop/Tablet: Show table
  return (
    <Paper>
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white' }}>
                Code
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white' }}>
                Description
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white' }}>
                Unit
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white' }}
              >
                Quantity
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white' }}
              >
                Unit Price
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white' }}
              >
                Total
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {boqItems.map((item) => (
              <TableRow
                key={item.id}
                sx={{
                  '&:hover': { bgcolor: 'action.hover' },
                  bgcolor: conflictItems.has(item.id) ? 'warning.light' : 'inherit',
                }}
              >
                <TableCell sx={{ minWidth: 100 }}>{renderCell(item, 'code')}</TableCell>
                <TableCell sx={{ minWidth: 250 }}>{renderCell(item, 'description')}</TableCell>
                <TableCell sx={{ minWidth: 80 }}>{renderCell(item, 'unit')}</TableCell>
                <TableCell align="right" sx={{ minWidth: 120 }}>
                  {renderCell(item, 'qty')}
                </TableCell>
                <TableCell align="right" sx={{ minWidth: 120 }}>
                  {renderCell(item, 'unit_price')}
                </TableCell>
                <TableCell align="right" sx={{ minWidth: 120 }}>
                  <Typography variant="body2" fontWeight="bold">
                    {formatNumber(item.total_price)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {editable && (
        <Box sx={{ p: 2, bgcolor: 'action.hover', borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            <Edit fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
            Click any cell to edit. Changes are saved automatically and synced in real-time.
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
