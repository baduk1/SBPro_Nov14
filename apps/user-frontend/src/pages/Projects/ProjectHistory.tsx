import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  IconButton,
  Stack,
  Typography,
  CircularProgress
} from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
  FolderOpen as FolderOpenIcon,
  CheckCircle as CheckCircleIcon,
  NoteAdd as NoteAddIcon,
  Edit as EditIcon,
  CloudUpload as CloudUploadIcon,
  PlayArrow as PlayArrowIcon
} from '@mui/icons-material'
import { projects } from '../../services/api'

const EVENT_ICONS: Record<string, React.ReactNode> = {
  created: <FolderOpenIcon />,
  updated: <EditIcon />,
  estimate_created: <NoteAddIcon />,
  job_completed: <CheckCircleIcon />,
  job_created: <PlayArrowIcon />,
  file_uploaded: <CloudUploadIcon />
}

const EVENT_COLORS: Record<string, 'primary' | 'info' | 'success' | 'secondary' | 'warning'> = {
  created: 'primary',
  updated: 'info',
  estimate_created: 'success',
  job_completed: 'secondary',
  job_created: 'warning',
  file_uploaded: 'info'
}

export default function ProjectHistory() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadHistory = async () => {
      if (!id) return
      try {
        setLoading(true)
        const data = await projects.getHistory(id)
        setHistory(data)
      } catch (err: any) {
        console.error('Failed to load history:', err)
        setError(err?.response?.data?.detail || 'Failed to load project history')
      } finally {
        setLoading(false)
      }
    }
    loadHistory()
  }, [id])

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{mt:2}}>
          Loading project history...
        </Typography>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" color="error" gutterBottom>
              Error Loading History
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {error}
            </Typography>
          </CardContent>
        </Card>
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <IconButton onClick={() => navigate('/app/dashboard')}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h4">
            Project History
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Timeline of all project events
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={2}>
        {history.map((event) => {
          const eventType = event.type || 'updated'
          const eventColor = EVENT_COLORS[eventType] || 'info'
          const eventIcon = EVENT_ICONS[eventType] || <EditIcon />
          
          return (
            <Card key={event.id}>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="start">
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: `${eventColor}.main`,
                      color: 'white'
                    }}
                  >
                    {eventIcon}
                  </Box>
                  <Box flex={1}>
                    <Stack direction="row" justifyContent="space-between" mb={1}>
                      <Chip
                        label={eventType.replace(/_/g, ' ').toUpperCase()}
                        size="small"
                        color={eventColor}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {new Date(event.timestamp).toLocaleString()}
                      </Typography>
                    </Stack>
                    <Typography variant="body1" mb={1}>
                      {event.description}
                    </Typography>
                    {event.user_name && (
                      <Typography variant="caption" color="text.secondary">
                        By {event.user_name}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )
        })}

        {history.length === 0 && (
          <Card>
            <CardContent>
              <Box textAlign="center" py={6}>
                <Typography variant="body1" color="text.secondary">
                  No history available yet. Start by uploading a file!
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Container>
  )
}
