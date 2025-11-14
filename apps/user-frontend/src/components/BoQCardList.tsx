/**
 * BoQ Card List Component
 *
 * Mobile-friendly card view for Bill of Quantities.
 * Used on small screens (<600px) as an alternative to table/grid view.
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Box,
  IconButton,
  Tooltip,
  Stack,
  Alert,
} from '@mui/material';
import { Edit as EditIcon, Warning } from '@mui/icons-material';
import { formatCurrency, formatNumber } from '../utils/currency';

export interface BoQItem {
  id: string;
  code: string | null;
  description: string;
  unit: string;
  qty: number;
  unit_price: number;
  total_price: number;
}

interface BoQCardListProps {
  items: BoQItem[];
  onEdit?: (item: BoQItem) => void;
  editable?: boolean;
  conflictItems?: Set<string>;
}

export default function BoQCardList({
  items,
  onEdit,
  editable = true,
  conflictItems = new Set(),
}: BoQCardListProps) {
  if (items.length === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No BoQ items found. Upload a file to generate quantities.
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: { xs: 1, sm: 2 },
      }}
    >
      {items.map((item) => {
        const hasConflict = conflictItems.has(item.id);

        return (
          <Card
            key={item.id}
            variant="outlined"
            sx={{
              bgcolor: hasConflict ? 'warning.light' : 'background.paper',
              '&:active': {
                transform: 'scale(0.98)',
                transition: 'transform 0.1s',
              },
            }}
          >
            <CardContent>
              {/* Header: Code + Edit Button */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1.5,
                }}
              >
                <Stack direction="row" spacing={0.5} alignItems="center">
                  {hasConflict && (
                    <Tooltip title="Item was modified by another user">
                      <Warning fontSize="small" color="warning" />
                    </Tooltip>
                  )}
                  <Chip
                    label={item.code || 'N/A'}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Stack>

                {editable && onEdit && (
                  <Tooltip title="Edit item">
                    <IconButton
                      size="small"
                      onClick={() => onEdit(item)}
                      sx={{
                        minWidth: '44px',
                        minHeight: '44px', // Touch-friendly
                      }}
                      aria-label={`Edit ${item.description}`}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>

              {/* Description */}
              <Typography
                variant="body1"
                sx={{
                  mb: 2,
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}
              >
                {item.description}
              </Typography>

              {/* Data Grid: Quantity, Rate, Total */}
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 0.5 }}
                  >
                    Quantity
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {formatNumber(item.qty)} <Box component="span" color="text.secondary">{item.unit}</Box>
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 0.5 }}
                  >
                    Unit Price
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {formatCurrency(item.unit_price)}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Box
                    sx={{
                      pt: 1.5,
                      borderTop: 1,
                      borderColor: 'divider',
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 0.5 }}
                    >
                      Total Amount
                    </Typography>
                    <Typography variant="h6" color="primary.main" fontWeight="bold">
                      {formatCurrency(item.total_price)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        );
      })}

      {/* Footer hint */}
      {editable && (
        <Box
          sx={{
            p: 2,
            bgcolor: 'action.hover',
            borderRadius: 1,
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            <EditIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
            Tap the edit icon to modify item details
          </Typography>
        </Box>
      )}
    </Box>
  );
}
