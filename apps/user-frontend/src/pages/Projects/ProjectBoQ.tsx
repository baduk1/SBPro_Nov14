/**
 * ProjectBoQ Component
 *
 * Bill of Quantities page for a project.
 * Automatically loads the latest completed job's BoQ, or uses ?job= query param.
 * Replaces the legacy /app/jobs/:id/boq route.
 */

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Alert,
  CircularProgress,
  Typography,
  Button,
  Stack,
  Breadcrumbs,
  Link,
  Paper,
  Snackbar,
  Chip,
} from '@mui/material'
import {
  ArrowBack,
  Download,
  People,
  Queue as QueueIcon,
} from '@mui/icons-material'
import { SiNotion } from 'react-icons/si'
import { jobs } from '../../services/api'
import BoQEditableGrid from '../../components/BoQEditableGrid'
import ExportQueueDrawer from '../../components/ExportQueueDrawer'
import NotionExportModal from '../../components/NotionExportModal'
import { useProjectContext } from '../../hooks/useProjectContext'
import { useProjectRoom, useUserPresence } from '../../contexts/WebSocketContext'

export default function ProjectBoQ() {
  const { id: projectId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { project, role } = useProjectContext(projectId || null)
  const { onlineCount } = useUserPresence()

  const [jobId, setJobId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [exportQueueOpen, setExportQueueOpen] = useState(false)
  const [notionModalOpen, setNotionModalOpen] = useState(false)

  // Join project room for real-time collaboration
  useProjectRoom(projectId || null)

  useEffect(() => {
    const fetchJobForProject = async () => {
      if (!projectId) {
        setError(new Error('Project ID is missing'))
        setLoading(false)
        return
      }

      // Priority 1: Use ?job= query param if present
      const queryJobId = searchParams.get('job')
      if (queryJobId) {
        setJobId(queryJobId)
        setLoading(false)
        return
      }

      // Priority 2: Fetch latest completed job for project
      setLoading(true)
      setError(null)

      try {
        const allJobs = await jobs.list()
        const projectJobs = allJobs.filter((job) => job.project_id === projectId)

        if (projectJobs.length === 0) {
          setError(new Error('No jobs found for this project'))
          setLoading(false)
          return
        }

        // Find latest completed job
        const completedJobs = projectJobs
          .filter((job) => job.status === 'COMPLETED')
          .sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime()
            const dateB = new Date(b.created_at || 0).getTime()
            return dateB - dateA // Most recent first
          })

        if (completedJobs.length === 0) {
          setError(new Error('No completed jobs found for this project'))
          setLoading(false)
          return
        }

        setJobId(completedJobs[0].id)
      } catch (err) {
        console.error('[ProjectBoQ] Failed to fetch jobs:', err)
        setError(err instanceof Error ? err : new Error('Failed to load BoQ'))
      } finally {
        setLoading(false)
      }
    }

    fetchJobForProject()
  }, [projectId, searchParams])

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    if (!jobId) return

    // Open export queue drawer to show progress
    setExportQueueOpen(true)

    try {
      await jobs.export(jobId, format)
      setSuccessMessage(`Export started: ${format.toUpperCase()}`)
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error(`Failed to export as ${format}`))
    }
  }

  const handleError = (errorMsg: string) => {
    setError(new Error(errorMsg))
  }

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  // Error state
  if (error || !jobId) {
    return (
      <Box>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate('/app/dashboard')}
            sx={{ cursor: 'pointer', textDecoration: 'none' }}
          >
            Dashboard
          </Link>
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate(`/app/projects/${projectId}/overview`)}
            sx={{ cursor: 'pointer', textDecoration: 'none' }}
          >
            {project?.name || 'Project'}
          </Link>
          <Typography variant="body2" color="text.primary">
            BoQ
          </Typography>
        </Breadcrumbs>

        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            No BoQ Data Available
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {error?.message || 'No completed jobs found for this project.'}
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate(`/app/upload?project=${projectId}`)}
          >
            Upload File
          </Button>
        </Alert>
      </Box>
    )
  }

  // Determine if user can edit (Phase 2 will use real role from backend)
  const canEdit = role === 'owner' || role === 'editor'

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate('/app/dashboard')}
            sx={{ cursor: 'pointer', textDecoration: 'none' }}
          >
            Dashboard
          </Link>
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate(`/app/projects/${projectId}/overview`)}
            sx={{ cursor: 'pointer', textDecoration: 'none' }}
          >
            {project?.name || 'Project'}
          </Link>
          <Typography variant="body2" color="text.primary">
            BoQ
          </Typography>
        </Breadcrumbs>

        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" mb={2}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Bill of Quantities
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {canEdit ? 'Edit and manage your BoQ items' : 'View-only mode'}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            {onlineCount > 0 && (
              <Chip
                icon={<People />}
                label={`${onlineCount} online`}
                color="success"
                variant="outlined"
                size="small"
              />
            )}
          </Stack>
        </Stack>

        {/* Export Actions */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Typography variant="body2" fontWeight="bold" sx={{ alignSelf: 'center' }}>
                Export:
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Download />}
                onClick={() => handleExport('csv')}
              >
                CSV
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Download />}
                onClick={() => handleExport('xlsx')}
              >
                Excel
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Download />}
                onClick={() => handleExport('pdf')}
              >
                PDF
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<SiNotion />}
                onClick={() => setNotionModalOpen(true)}
                sx={{ color: 'text.primary' }}
              >
                Notion
              </Button>
            </Stack>
            <Button
              size="small"
              variant="contained"
              startIcon={<QueueIcon />}
              onClick={() => setExportQueueOpen(true)}
              sx={{
                minWidth: { xs: '100%', sm: 'auto' },
                minHeight: '44px',
              }}
              aria-label="View export queue"
            >
              View Queue
            </Button>
          </Stack>
        </Paper>
      </Box>

      {/* BoQ Grid */}
      <BoQEditableGrid
        jobId={jobId}
        projectId={projectId}
        editable={canEdit}
        onError={handleError}
      />

      {/* Success Toast */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
      />

      {/* Export Queue Drawer */}
      {jobId && (
        <ExportQueueDrawer
          jobId={jobId}
          open={exportQueueOpen}
          onClose={() => setExportQueueOpen(false)}
        />
      )}

      {/* Notion Export Modal */}
      {jobId && (
        <NotionExportModal
          open={notionModalOpen}
          onClose={() => setNotionModalOpen(false)}
          jobId={jobId}
          projectName={project?.name || 'Untitled Project'}
        />
      )}
    </Box>
  )
}
