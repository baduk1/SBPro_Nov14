/**
 * UpcomingTasksWidget Component
 *
 * Displays upcoming tasks due this week.
 * Shows up to 5 tasks ordered by due date.
 */

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Skeleton,
  Alert,
  Box,
  Button,
} from '@mui/material'
import { Assignment as TaskIcon } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { tasks, Task } from '../../../services/api'

interface UpcomingTasksWidgetProps {
  projectId: string
}

export default function UpcomingTasksWidget({ projectId }: UpcomingTasksWidgetProps) {
  const navigate = useNavigate()
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUpcomingTasks = async () => {
      setLoading(true)
      setError(null)

      try {
        const allTasks = await tasks.list(projectId, { status: 'in_progress,todo' })

        // Filter tasks due within next 7 days
        const now = new Date()
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

        const upcoming = allTasks
          .filter((task) => {
            if (!task.due_date) return false
            const dueDate = new Date(task.due_date)
            return dueDate >= now && dueDate <= nextWeek
          })
          .sort((a, b) => {
            const dateA = new Date(a.due_date!).getTime()
            const dateB = new Date(b.due_date!).getTime()
            return dateA - dateB
          })
          .slice(0, 5)

        setUpcomingTasks(upcoming)
      } catch (err) {
        console.error('[UpcomingTasksWidget] Failed to fetch tasks:', err)
        setError('Failed to load tasks')
      } finally {
        setLoading(false)
      }
    }

    fetchUpcomingTasks()
  }, [projectId])

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays < 7) return `In ${diffDays} days`
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
  }

  const getPriorityColor = (priority: string | null) => {
    if (!priority) return 'default'
    if (priority.toLowerCase() === 'high') return 'error'
    if (priority.toLowerCase() === 'medium') return 'warning'
    return 'default'
  }

  const handleViewAllTasks = () => {
    navigate(`/app/projects/${projectId}/tasks`)
  }

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Upcoming Tasks
          </Typography>
          {[1, 2, 3].map((i) => (
            <Box key={i} sx={{ mb: 1 }}>
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="40%" />
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
            Upcoming Tasks
          </Typography>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    )
  }

  if (upcomingTasks.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Upcoming Tasks
          </Typography>
          <Alert severity="info">No upcoming tasks this week</Alert>
          <Button
            variant="outlined"
            startIcon={<TaskIcon />}
            onClick={handleViewAllTasks}
            fullWidth
            size="small"
            sx={{ mt: 2 }}
          >
            View All Tasks
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Upcoming Tasks
        </Typography>
        <List dense disablePadding>
          {upcomingTasks.map((task) => (
            <ListItem key={task.id} disableGutters sx={{ mb: 1 }}>
              <ListItemText
                primary={task.title}
                secondary={
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    {task.due_date && (
                      <Chip
                        label={formatDueDate(task.due_date)}
                        size="small"
                        variant="outlined"
                      />
                    )}
                    {task.priority && (
                      <Chip
                        label={task.priority}
                        size="small"
                        color={getPriorityColor(task.priority)}
                      />
                    )}
                  </Box>
                }
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          ))}
        </List>
        <Button
          variant="outlined"
          startIcon={<TaskIcon />}
          onClick={handleViewAllTasks}
          fullWidth
          size="small"
          sx={{ mt: 1 }}
        >
          View All Tasks
        </Button>
      </CardContent>
    </Card>
  )
}
