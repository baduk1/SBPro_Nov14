import { useEffect, useState } from 'react'
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
  Typography,
  Alert,
  CircularProgress
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { estimates, EstimateListItem } from '../../services/api'

export default function EstimatesList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<EstimateListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadEstimates()
  }, [])

  const loadEstimates = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await estimates.list()
      setItems(data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load estimates')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this estimate?')) return

    try {
      await estimates.delete(id)
      await loadEstimates()
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to delete estimate')
    }
  }

  const filteredEstimates = items.filter(estimate =>
    estimate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (estimate.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Estimates
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cost estimates for your projects
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

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

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
          <Grid item xs={12} md={6} key={estimate.id}>
            <Card
              sx={{
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: 6,
                  transform: 'translateY(-4px)'
                }
              }}
              onClick={() => navigate(`/app/estimates/${estimate.id}`)}
            >
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="start" mb={2}>
                  <Stack direction="row" spacing={2} alignItems="start">
                    <ReceiptIcon color="warning" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h6">
                        {estimate.name}
                      </Typography>
                      {estimate.description && (
                        <Typography variant="body2" color="text.secondary" mb={1}>
                          {estimate.description}
                        </Typography>
                      )}
                      <Typography variant="h5" color="primary">
                        {estimate.currency} {estimate.total.toLocaleString()}
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={0.5}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/app/estimates/${estimate.id}`)
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(estimate.id)
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  <Chip
                    label={`${estimate.items_count} items`}
                    size="small"
                    variant="outlined"
                  />

                  <Chip
                    label={`Subtotal: ${estimate.currency} ${estimate.subtotal.toLocaleString()}`}
                    size="small"
                    color="info"
                  />

                  <Chip
                    label={new Date(estimate.created_at).toLocaleDateString()}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredEstimates.length === 0 && !loading && (
        <Box textAlign="center" py={8}>
          <ReceiptIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No estimates found
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {searchQuery ? 'Try adjusting your search' : 'Create your first estimate to get started'}
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
