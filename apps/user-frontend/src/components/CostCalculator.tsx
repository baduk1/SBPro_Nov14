import { useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Alert
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Calculate as CalculateIcon
} from '@mui/icons-material'
import { mockCostAdjustments, mockEstimates } from '../mocks/mockData'
import type { CostAdjustment } from '../types/extended'

interface CostCalculatorProps {
  estimateId: string
}

const CATEGORY_OPTIONS = [
  { value: 'overhead', label: 'Overhead' },
  { value: 'profit', label: 'Profit Margin' },
  { value: 'tax', label: 'Tax' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'custom', label: 'Custom' }
]

const CALC_TYPE_OPTIONS = [
  { value: 'percent', label: 'Percentage (%)' },
  { value: 'fixed', label: 'Fixed Amount' },
  { value: 'per_unit', label: 'Per Unit' }
]

export default function CostCalculator({ estimateId }: CostCalculatorProps) {
  const estimate = mockEstimates.find(e => e.id === estimateId)
  const [adjustments, setAdjustments] = useState<CostAdjustment[]>(
    mockCostAdjustments.filter(adj => adj.estimate_id === estimateId)
  )

  const [newAdjustment, setNewAdjustment] = useState({
    category: 'overhead',
    name: '',
    calculation_type: 'percent',
    value: 0
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  const handleAddAdjustment = () => {
    if (!newAdjustment.name || newAdjustment.value <= 0) {
      alert('Please fill in all fields')
      return
    }

    const mockCalculatedAmount =
      newAdjustment.calculation_type === 'percent'
        ? (estimate!.base_total * newAdjustment.value) / 100
        : newAdjustment.value

    const adjustment: CostAdjustment = {
      id: `adj-${Date.now()}`,
      estimate_id: estimateId,
      category: newAdjustment.category as any,
      name: newAdjustment.name,
      calculation_type: newAdjustment.calculation_type as any,
      value: newAdjustment.value,
      applied_to: 'subtotal',
      order: adjustments.length + 1,
      created_at: new Date().toISOString(),
      calculated_amount: mockCalculatedAmount
    }

    setAdjustments([...adjustments, adjustment])
    setNewAdjustment({
      category: 'overhead',
      name: '',
      calculation_type: 'percent',
      value: 0
    })

    alert('Adjustment added! (Mock - not saved to backend)')
  }

  const handleDeleteAdjustment = (id: string) => {
    setAdjustments(adjustments.filter(adj => adj.id !== id))
    alert('Adjustment deleted! (Mock)')
  }

  const calculateTotals = () => {
    const adjustmentsTotal = adjustments.reduce((sum, adj) => sum + (adj.calculated_amount || 0), 0)
    return {
      base: estimate?.base_total || 0,
      adjustments: adjustmentsTotal,
      final: (estimate?.base_total || 0) + adjustmentsTotal
    }
  }

  const totals = calculateTotals()

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Left: Add Adjustment Form */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Add Cost Adjustment
              </Typography>

              <Stack spacing={2.5} mt={2}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={newAdjustment.category}
                    label="Category"
                    onChange={(e) => setNewAdjustment({ ...newAdjustment, category: e.target.value })}
                  >
                    {CATEGORY_OPTIONS.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Name"
                  fullWidth
                  value={newAdjustment.name}
                  onChange={(e) => setNewAdjustment({ ...newAdjustment, name: e.target.value })}
                  placeholder="e.g. General Overhead"
                />

                <FormControl fullWidth>
                  <InputLabel>Calculation Type</InputLabel>
                  <Select
                    value={newAdjustment.calculation_type}
                    label="Calculation Type"
                    onChange={(e) => setNewAdjustment({ ...newAdjustment, calculation_type: e.target.value })}
                  >
                    {CALC_TYPE_OPTIONS.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Value"
                  type="number"
                  fullWidth
                  value={newAdjustment.value}
                  onChange={(e) => setNewAdjustment({ ...newAdjustment, value: parseFloat(e.target.value) || 0 })}
                  helperText={
                    newAdjustment.calculation_type === 'percent'
                      ? 'Enter percentage (e.g. 10 for 10%)'
                      : 'Enter fixed amount in GBP'
                  }
                />

                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<AddIcon />}
                  onClick={handleAddAdjustment}
                  size="large"
                >
                  Add Adjustment
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Adjustments List & Totals */}
        <Grid item xs={12} md={6}>
          {/* Current Adjustments */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Current Adjustments ({adjustments.length})
              </Typography>

              <Stack spacing={1.5} mt={2}>
                {adjustments.length === 0 && (
                  <Alert severity="info">
                    No adjustments added yet. Add your first adjustment to calculate final total.
                  </Alert>
                )}

                {adjustments.map((adj) => (
                  <Card key={adj.id} variant="outlined">
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box flex={1}>
                          <Typography variant="body2" fontWeight="medium">
                            {adj.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {adj.category} • {adj.calculation_type === 'percent' ? `${adj.value}%` : formatCurrency(adj.value)}
                          </Typography>
                        </Box>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body1" fontWeight="medium" color="success.main">
                            +{formatCurrency(adj.calculated_amount || 0)}
                          </Typography>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteAdjustment(adj.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </CardContent>
          </Card>

          {/* Totals Breakdown */}
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <CalculateIcon color="primary" />
                <Typography variant="h6">
                  Cost Breakdown
                </Typography>
              </Stack>

              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Base Total
                  </Typography>
                  <Typography variant="body1">
                    {formatCurrency(totals.base)}
                  </Typography>
                </Stack>

                {adjustments.map((adj) => (
                  <Stack key={adj.id} direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      + {adj.name}
                    </Typography>
                    <Typography variant="body2" color="success.main">
                      +{formatCurrency(adj.calculated_amount || 0)}
                    </Typography>
                  </Stack>
                ))}

                <Divider sx={{ my: 1 }} />

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">
                    Final Total
                  </Typography>
                  <Typography variant="h5" color="primary.main">
                    {formatCurrency(totals.final)}
                  </Typography>
                </Stack>
              </Stack>

              <Button
                variant="outlined"
                fullWidth
                sx={{ mt: 3 }}
                onClick={() => alert('Recalculate & Save - to be implemented')}
              >
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
