import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon
} from '@mui/icons-material'
import { suppliers } from '../../services/api'

export default function SupplierCreate() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    contact_info: '',
    is_default: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await suppliers.create({
        name: formData.name,
        contact_info: formData.contact_info || undefined,
        is_default: formData.is_default
      })
      navigate('/app/suppliers')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create supplier')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <IconButton onClick={() => navigate('/app/suppliers')}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h4">
            Add New Supplier
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create a new supplier and manage their price list
          </Typography>
        </Box>
      </Stack>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <TextField
                label="Supplier Name"
                required
                fullWidth
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. BuildMaster Supplies Ltd"
              />

              <TextField
                label="Contact Information"
                fullWidth
                multiline
                rows={3}
                value={formData.contact_info}
                onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
                placeholder="Email, phone, address..."
                helperText="Optional: Add contact details for reference"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  />
                }
                label="Set as default supplier"
              />

              <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Note:</strong> After creating the supplier, you can import price items
                  from a CSV file or add them manually.
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Actions */}
        <Stack direction="row" spacing={2} justifyContent="flex-end" mt={3}>
          <Button
            variant="outlined"
            onClick={() => navigate('/app/suppliers')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            disabled={loading || !formData.name}
          >
            {loading ? 'Creating...' : 'Create Supplier'}
          </Button>
        </Stack>
      </form>
    </Container>
  )
}
