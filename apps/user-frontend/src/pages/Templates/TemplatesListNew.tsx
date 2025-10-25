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
  Description as DescriptionIcon,
  Star as StarIcon
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { templates, TemplateListItem } from '../../services/api'

export default function TemplatesList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<TemplateListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await templates.list()
      setItems(data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      await templates.delete(id)
      await loadTemplates()
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to delete template')
    }
  }

  const filteredTemplates = items.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (template.description?.toLowerCase().includes(searchQuery.toLowerCase()))
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
            Templates
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Reusable BoQ templates for your projects
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/app/templates/new')}
        >
          Create Template
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
        placeholder="Search templates..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 3 }}
      />

      {/* Templates Grid */}
      <Grid container spacing={3}>
        {filteredTemplates.map((template) => (
          <Grid item xs={12} md={6} key={template.id}>
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
              onClick={() => navigate(`/app/templates/${template.id}`)}
            >
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="start" mb={2}>
                  <Stack direction="row" spacing={2} alignItems="start">
                    <DescriptionIcon color="primary" sx={{ fontSize: 40 }} />
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="h6">
                          {template.name}
                        </Typography>
                        {template.is_default && (
                          <StarIcon color="warning" fontSize="small" />
                        )}
                      </Stack>
                      {template.description && (
                        <Typography variant="body2" color="text.secondary" mb={1}>
                          {template.description}
                        </Typography>
                      )}
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={0.5}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/app/templates/${template.id}`)
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(template.id)
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {template.category && (
                    <Chip
                      label={template.category}
                      size="small"
                      color="primary"
                    />
                  )}

                  <Chip
                    label={`${template.items_count} items`}
                    size="small"
                    variant="outlined"
                  />

                  <Chip
                    label={new Date(template.created_at).toLocaleDateString()}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredTemplates.length === 0 && !loading && (
        <Box textAlign="center" py={8}>
          <DescriptionIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No templates found
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {searchQuery ? 'Try adjusting your search' : 'Create your first template to get started'}
          </Typography>
          {!searchQuery && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/app/templates/new')}
            >
              Create Template
            </Button>
          )}
        </Box>
      )}
    </Container>
  )
}
