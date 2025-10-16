import { useState, useEffect } from 'react'
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
  CircularProgress
} from '@mui/material'
import {
  Add as AddIcon,
  Business as BusinessIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { suppliers as suppliersApi, Supplier } from '../../services/api'

export default function SuppliersList() {
  const navigate = useNavigate()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSuppliers()
  }, [])

  const loadSuppliers = async () => {
    try {
      setLoading(true)
      const data = await suppliersApi.list()
      setSuppliers(data)
    } catch (error) {
      console.error('Failed to load suppliers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete supplier "${name}"? This will also delete all their price items.`)) {
      return
    }
    try {
      await suppliersApi.delete(id)
      await loadSuppliers()
    } catch (error: any) {
      alert(error?.response?.data?.detail || 'Failed to delete supplier')
    }
  }

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (supplier.contact_info?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, textAlign: 'center', py: 8 }}>
        <CircularProgress />
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          Loading suppliers...
        </Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Suppliers Catalog
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your suppliers and their price lists
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/app/suppliers/new')}
        >
          Add Supplier
        </Button>
      </Stack>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search suppliers..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 3 }}
      />

      {/* Suppliers Grid */}
      <Grid container spacing={3}>
        {filteredSuppliers.map((supplier) => (
          <Grid item xs={12} md={6} key={supplier.id}>
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
              onClick={() => navigate(`/app/suppliers/${supplier.id}`)}
            >
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="start" mb={2}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <BusinessIcon color="primary" sx={{ fontSize: 40 }} />
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="h6">
                          {supplier.name}
                        </Typography>
                        {supplier.is_default && (
                          <StarIcon color="warning" fontSize="small" />
                        )}
                      </Stack>
                      {supplier.is_default && (
                        <Chip
                          label="Default"
                          size="small"
                          color="warning"
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={0.5}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/app/suppliers/${supplier.id}/edit`)
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(supplier.id, supplier.name)
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>

                {supplier.contact_info && (
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {supplier.contact_info}
                  </Typography>
                )}

                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <Chip
                    label={`${supplier.price_items_count || 0} Price Items`}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                  <Chip
                    label={new Date(supplier.created_at).toLocaleDateString()}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredSuppliers.length === 0 && (
        <Box textAlign="center" py={8}>
          <BusinessIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No suppliers found
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {searchQuery ? 'Try adjusting your search' : 'Add your first supplier to get started'}
          </Typography>
          {!searchQuery && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/app/suppliers/new')}
            >
              Add Supplier
            </Button>
          )}
        </Box>
      )}
    </Container>
  )
}
