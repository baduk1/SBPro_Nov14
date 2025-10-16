import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper
} from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material'
import { mockTemplates, mockTemplateMappings } from '../../mocks/mockData'

export default function TemplateDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const template = mockTemplates.find(t => t.id === id)
  const mappings = mockTemplateMappings.filter(m => m.template_id === id)

  if (!template) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography>Template not found</Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <IconButton onClick={() => navigate('/app/templates')}>
          <ArrowBackIcon />
        </IconButton>
        <Box flex={1}>
          <Typography variant="h4" mb={0.5}>
            {template.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {template.description || 'No description'}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<CopyIcon />}
          onClick={() => alert('Clone template - to be implemented')}
        >
          Clone
        </Button>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={() => navigate(`/app/templates/${id}/edit`)}
        >
          Edit
        </Button>
      </Stack>

      {/* Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} mb={2}>
            <Chip label={template.template_type.toUpperCase()} color="primary" />
            <Chip
              label={template.is_public ? 'Public' : 'Private'}
              color={template.is_public ? 'success' : 'default'}
            />
            <Chip label={new Date(template.created_at).toLocaleDateString()} variant="outlined" />
          </Stack>
        </CardContent>
      </Card>

      {/* Mappings */}
      {template.template_type === 'mapping' && (
        <>
          <Typography variant="h6" mb={2}>
            Mappings ({mappings.length})
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Source Code</strong></TableCell>
                  <TableCell><strong>Target Code</strong></TableCell>
                  <TableCell align="right"><strong>Allowance %</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mappings.map((mapping) => (
                  <TableRow key={mapping.id} hover>
                    <TableCell>{mapping.source_code}</TableCell>
                    <TableCell>{mapping.target_code}</TableCell>
                    <TableCell align="right">{mapping.allowance_percent}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {mappings.length === 0 && (
            <Box textAlign="center" py={6}>
              <Typography variant="body1" color="text.secondary">
                No mappings defined yet
              </Typography>
            </Box>
          )}
        </>
      )}
    </Container>
  )
}
