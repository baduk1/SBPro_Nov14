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
  Public as PublicIcon,
  Lock as LockIcon,
  Description as DescriptionIcon
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { mockTemplates } from '../../mocks/mockData'
import type { Template } from '../../types/extended'

const TEMPLATE_TYPE_LABELS = {
  mapping: 'Mapping',
  pricing: 'Pricing',
  export: 'Export'
}

const TEMPLATE_TYPE_COLORS = {
  mapping: 'primary',
  pricing: 'success',
  export: 'info'
} as const

export default function TemplatesList() {
  const navigate = useNavigate()
  const [templates] = useState<Template[]>(mockTemplates)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (template.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Templates Library
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Reusable configurations for your projects
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
                      <Typography variant="h6" gutterBottom>
                        {template.name}
                      </Typography>
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
                        alert('Clone template functionality - to be implemented')
                      }}
                      title="Clone template"
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/app/templates/${template.id}/edit`)
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation()
                        alert('Delete functionality - to be implemented')
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  <Chip
                    label={TEMPLATE_TYPE_LABELS[template.template_type]}
                    size="small"
                    color={TEMPLATE_TYPE_COLORS[template.template_type]}
                  />

                  {template.is_public ? (
                    <Chip
                      icon={<PublicIcon />}
                      label="Public"
                      size="small"
                      variant="outlined"
                      color="success"
                    />
                  ) : (
                    <Chip
                      icon={<LockIcon />}
                      label="Private"
                      size="small"
                      variant="outlined"
                    />
                  )}

                  {template.template_type === 'mapping' && (
                    <Chip
                      label={`${template.mappings_count || 0} Mappings`}
                      size="small"
                      variant="outlined"
                    />
                  )}

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

      {filteredTemplates.length === 0 && (
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
