import { useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import {
  Add as AddIcon,
  ContentCopy as CopyIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { mockEstimates } from '../../mocks/mockData'
import type { Estimate } from '../../types/extended'

const STATUS_COLORS = {
  draft: 'warning',
  final: 'success',
  archived: 'default'
} as const

export default function EstimatesList() {
  const navigate = useNavigate()
  const [estimates] = useState<Estimate[]>(mockEstimates)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredEstimates = estimates.filter(est =>
    est.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (est.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Estimates Library
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Saved estimates and bills of quantities
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/app/estimates/new')}
        >
          Create Estimate
        </Button>
      </Stack>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search estimates..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 3 }}
      />

      {/* Estimates Grid */}
      <Grid container spacing={3}>
        {filteredEstimates.map((estimate) => (
          <Grid item xs={12} key={estimate.id}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: 6,
                  transform: 'translateY(-2px)'
                }
              }}
              onClick={() => navigate(`/app/estimates/${estimate.id}`)}
            >
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="start">
                  <Stack direction="row" spacing={2} flex={1}>
                    <ReceiptIcon color="primary" sx={{ fontSize: 48 }} />
                    <Box flex={1}>
                      <Typography variant="h6" gutterBottom>
                        {estimate.name}
                      </Typography>
                      {estimate.description && (
                        <Typography variant="body2" color="text.secondary" mb={2}>
                          {estimate.description}
                        </Typography>
                      )}

                      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                        <Chip
                          label={estimate.status.toUpperCase()}
                          size="small"
                          color={STATUS_COLORS[estimate.status]}
                        />
                        <Chip
                          label={`${estimate.items_count || 0} Items`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={new Date(estimate.created_at).toLocaleDateString()}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                    </Box>
                  </Stack>

                  <Box sx={{ ml: 3, textAlign: 'right', minWidth: 200 }}>
                    <Typography variant="caption" color="text.secondary">
                      Base Total
                    </Typography>
                    <Typography variant="h6">
                      {formatCurrency(estimate.base_total)}
                    </Typography>

                    {estimate.adjustments_total > 0 && (
                      <>
                        <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" justifyContent="flex-end" mt={1}>
                          <TrendingUpIcon fontSize="small" sx={{ mr: 0.5 }} />
                          +{formatCurrency(estimate.adjustments_total)}
                        </Typography>
                        <Typography variant="h5" color="primary.main" sx={{ mt: 0.5 }}>
                          {formatCurrency(estimate.final_total)}
                        </Typography>
                      </>
                    )}

                    <Stack direction="row" spacing={0.5} justifyContent="flex-end" mt={2}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          alert('Duplicate estimate - to be implemented')
                        }}
                        title="Duplicate"
                      >
                        <CopyIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/app/estimates/${estimate.id}/edit`)
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation()
                          alert('Delete - to be implemented')
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredEstimates.length === 0 && (
        <Box textAlign="center" py={8}>
          <ReceiptIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No estimates found
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {searchQuery ? 'Try adjusting your search' : 'Create your first estimate from a takeoff or manually'}
          </Typography>
          {!searchQuery && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/app/estimates/new')}
            >
              Create Estimate
            </Button>
          )}
        </Box>
      )}
    </Container>
  )
}
