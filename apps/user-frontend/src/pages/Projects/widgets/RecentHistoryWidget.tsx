/**
 * RecentHistoryWidget Component
 *
 * Displays recent activity/history for the project.
 * Shows up to 5 most recent events.
 */

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Skeleton,
  Alert,
  Box,
  Button,
} from '@mui/material'
import {
  History as HistoryIcon,
  Upload as UploadIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Group as TeamIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { projects } from '../../../services/api'

interface HistoryEvent {
  id: string
  type: string
  description: string
  timestamp: string
  user?: string
}

interface RecentHistoryWidgetProps {
  projectId: string
}

export default function RecentHistoryWidget({ projectId }: RecentHistoryWidgetProps) {
  const navigate = useNavigate()
  const [events, setEvents] = useState<HistoryEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true)
      setError(null)

      try {
        const history = await projects.getHistory(projectId)
        setEvents(history.slice(0, 5))
      } catch (err) {
        console.error('[RecentHistoryWidget] Failed to fetch history:', err)
        setError('Failed to load history')
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [projectId])

  const getEventIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'upload':
        return <UploadIcon fontSize="small" />
      case 'edit':
      case 'update':
        return <EditIcon fontSize="small" />
      case 'export':
      case 'download':
        return <DownloadIcon fontSize="small" />
      case 'team':
      case 'collaborator':
        return <TeamIcon fontSize="small" />
      default:
        return <HistoryIcon fontSize="small" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
  }

  const handleViewFullHistory = () => {
    navigate(`/app/projects/${projectId}/history`)
  }

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Activity
          </Typography>
          {[1, 2, 3].map((i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Skeleton variant="circular" width={32} height={32} sx={{ mr: 2 }} />
              <Box sx={{ flexGrow: 1 }}>
                <Skeleton variant="text" width="80%" />
                <Skeleton variant="text" width="40%" />
              </Box>
            </Box>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Activity
          </Typography>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    )
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Activity
          </Typography>
          <Alert severity="info">No recent activity</Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Recent Activity
        </Typography>
        <List dense disablePadding>
          {events.map((event) => (
            <ListItem key={event.id} disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {getEventIcon(event.type)}
              </ListItemIcon>
              <ListItemText
                primary={event.description}
                secondary={formatTimestamp(event.timestamp)}
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          ))}
        </List>
        <Button
          variant="outlined"
          startIcon={<HistoryIcon />}
          onClick={handleViewFullHistory}
          fullWidth
          size="small"
          sx={{ mt: 1 }}
        >
          View Full History
        </Button>
      </CardContent>
    </Card>
  )
}
