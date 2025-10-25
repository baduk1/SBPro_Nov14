import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Divider,
  Paper
} from '@mui/material'
import {
  ArrowBack as BackIcon,
  Save as SaveIcon
} from '@mui/icons-material'
import { estimates } from '../../services/api'

export default function EstimateDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [estimate, setEstimate] = useState<any>(null)

  useEffect(() => {
    if (!isNew && id) {
      loadEstimate()
    }
  }, [id, isNew])

  const loadEstimate = async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const data = await estimates.get(id)
      setEstimate(data)
      setName(data.name)
      setDescription(data.description || '')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load estimate')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Estimate name is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (isNew) {
        const created = await estimates.create({
          name,
          description,
          currency: 'GBP',
          items: [],
          adjustments: []
        })
        navigate(`/app/estimates/${created.id}`)
      } else if (id) {
        await estimates.update(id, {
          name,
          description
        })
        await loadEstimate()
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to save estimate')
    } finally {
      setSaving(false)
    }
  }

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
      <Stack direction="row" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate('/app/estimates')}>
          <BackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ ml: 2 }}>
          {isNew ? 'Create Estimate' : 'Estimate Details'}
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Estimate Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={3}>
            <TextField
              label="Estimate Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
            />

            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Items & Summary */}
      {estimate && !isNew && (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" mb={2}>Line Items</Typography>
              {estimate.items.length > 0 ? (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Description</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Unit Price</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {estimate.items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">
                          {item.currency} {item.unit_price.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          {item.currency} {item.total_price.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No items yet
                </Typography>
              )}
            </CardContent>
          </Card>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" mb={2}>Cost Summary</Typography>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography>Subtotal:</Typography>
                <Typography>
                  {estimate.currency} {estimate.subtotal.toLocaleString()}
                </Typography>
              </Stack>

              {estimate.adjustments.map((adj: any) => (
                <Stack key={adj.id} direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">{adj.name}:</Typography>
                  <Typography color="text.secondary">
                    {estimate.currency} {adj.amount.toLocaleString()}
                  </Typography>
                </Stack>
              ))}

              <Divider sx={{ my: 1 }} />

              <Stack direction="row" justifyContent="space-between">
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6" color="primary">
                  {estimate.currency} {estimate.total.toLocaleString()}
                </Typography>
              </Stack>
            </Stack>
          </Paper>
        </>
      )}

      {/* Actions */}
      <Stack direction="row" spacing={2} mt={3}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Estimate'}
        </Button>
        <Button variant="outlined" onClick={() => navigate('/app/estimates')}>
          Cancel
        </Button>
      </Stack>
    </Container>
  )
}
