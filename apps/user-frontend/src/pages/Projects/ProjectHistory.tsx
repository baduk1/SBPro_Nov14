import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  IconButton,
  Stack,
  Typography
} from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
  FolderOpen as FolderOpenIcon,
  CheckCircle as CheckCircleIcon,
  NoteAdd as NoteAddIcon,
  Edit as EditIcon
} from '@mui/icons-material'
import { mockProjectHistory } from '../../mocks/mockData'

const EVENT_ICONS = {
  created: <FolderOpenIcon />,
  updated: <EditIcon />,
  estimate_added: <NoteAddIcon />,
  job_completed: <CheckCircleIcon />
}

const EVENT_COLORS = {
  created: 'primary',
  updated: 'info',
  estimate_added: 'success',
  job_completed: 'secondary'
} as const

export default function ProjectHistory() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const history = mockProjectHistory.filter(h => h.project_id === id)

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
        {history.map((event) => (
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
                    bgcolor: `${EVENT_COLORS[event.event_type]}.main`,
                    color: 'white'
                  }}
                >
                  {EVENT_ICONS[event.event_type]}
                </Box>
                <Box flex={1}>
                  <Stack direction="row" justifyContent="space-between" mb={1}>
                    <Chip
                      label={event.event_type.replace('_', ' ').toUpperCase()}
                      size="small"
                      color={EVENT_COLORS[event.event_type]}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(event.created_at).toLocaleString()}
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
        ))}

        {history.length === 0 && (
          <Card>
            <CardContent>
              <Box textAlign="center" py={6}>
                <Typography variant="body1" color="text.secondary">
                  No history available
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Container>
  )
}
