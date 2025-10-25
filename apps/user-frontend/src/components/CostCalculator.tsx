import { useState, useEffect } from 'react'
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
  Alert,
  CircularProgress
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Calculate as CalculateIcon
} from '@mui/icons-material'
import { estimates, type Estimate, type CostAdjustment } from '../services/api'

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
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [adjustments, setAdjustments] = useState<CostAdjustment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [newAdjustment, setNewAdjustment] = useState({
    name: '',
    adjustment_type: 'percentage' as 'percentage' | 'fixed',
    value: 0
  })

  useEffect(() => {
    loadData()
  }, [estimateId])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await estimates.get(estimateId)
      setEstimate(data)
      setAdjustments(data.adjustments || [])
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load estimate')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  const handleAddAdjustment = async () => {
    if (!newAdjustment.name || newAdjustment.value <= 0) {
      setError('Please fill in all fields with valid values')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const created = await estimates.createAdjustment(estimateId, {
        name: newAdjustment.name,
        adjustment_type: newAdjustment.adjustment_type,
        value: newAdjustment.value,
        sort_order: adjustments.length
      })

      setAdjustments([...adjustments, created])
      setNewAdjustment({
        name: '',
        adjustment_type: 'percentage',
        value: 0
      })

      // Reload estimate to get updated totals
      await loadData()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to add adjustment')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAdjustment = async (id: string) => {
    if (!confirm('Delete this adjustment?')) return

    setSaving(true)
    setError(null)

    try {
      await estimates.deleteAdjustment(estimateId, id)
      setAdjustments(adjustments.filter(adj => adj.id !== id))

      // Reload estimate to get updated totals
      await loadData()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to delete adjustment')
    } finally {
      setSaving(false)
    }
  }

  const calculateTotals = () => {
    return {
      base: estimate?.subtotal || 0,
      adjustments: adjustments.reduce((sum, adj) => sum + (adj.amount || 0), 0),
      final: estimate?.total || 0
    }
  }

  const totals = calculateTotals()

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    )
  }

  if (error && !estimate) {
    return (
      <Alert severity="error">{error}</Alert>
    )
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Grid container spacing={3}>
        {/* Left: Add Adjustment Form */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Add Cost Adjustment
              </Typography>

              <Stack spacing={2.5} mt={2}>
                <TextField
                  label="Adjustment Name"
                  fullWidth
                  required
                  value={newAdjustment.name}
                  onChange={(e) => setNewAdjustment({ ...newAdjustment, name: e.target.value })}
                  placeholder="e.g. Overhead, Profit Margin, Tax"
                  disabled={saving}
                />

                <FormControl fullWidth required>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={newAdjustment.adjustment_type}
                    label="Type"
                    onChange={(e) => setNewAdjustment({ ...newAdjustment, adjustment_type: e.target.value as 'percentage' | 'fixed' })}
                    disabled={saving}
                  >
                    <MenuItem value="percentage">Percentage (%)</MenuItem>
                    <MenuItem value="fixed">Fixed Amount</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Value"
                  type="number"
                  fullWidth
                  required
                  value={newAdjustment.value}
                  onChange={(e) => setNewAdjustment({ ...newAdjustment, value: parseFloat(e.target.value) || 0 })}
                  helperText={
                    newAdjustment.adjustment_type === 'percentage'
                      ? 'Enter percentage (e.g. 10 for 10%)'
                      : 'Enter fixed amount in GBP'
                  }
                  disabled={saving}
                  inputProps={{ step: '0.01', min: '0' }}
                />

                <Button
                  variant="contained"
                  fullWidth
                  startIcon={saving ? <CircularProgress size={20} /> : <AddIcon />}
                  onClick={handleAddAdjustment}
                  size="large"
                  disabled={saving || !newAdjustment.name || newAdjustment.value <= 0}
                >
                  {saving ? 'Adding...' : 'Add Adjustment'}
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
                            {adj.adjustment_type === 'percentage' ? `${adj.value}%` : formatCurrency(adj.value)}
                          </Typography>
                        </Box>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body1" fontWeight="medium" color="success.main">
                            +{formatCurrency(adj.amount || 0)}
                          </Typography>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteAdjustment(adj.id)}
                            disabled={saving}
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
                      +{formatCurrency(adj.amount || 0)}
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
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
