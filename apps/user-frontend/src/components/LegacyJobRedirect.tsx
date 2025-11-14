/**
 * LegacyJobRedirect Component
 *
 * Redirects old job-based URLs to new project-based URLs.
 * Handles:
 * - /app/jobs/:id/boq → /app/projects/:projectId/boq?job=:id
 * - /app/jobs/:id/takeoff → /app/projects/:projectId/boq?job=:id
 *
 * This ensures bookmarks and old links continue to work.
 */

import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CircularProgress, Box, Typography } from '@mui/material'
import { jobs } from '../services/api'

export default function LegacyJobRedirect() {
  const { id: jobId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    const redirect = async () => {
      if (!jobId) {
        console.error('[LegacyJobRedirect] No job ID provided')
        navigate('/app/dashboard', { replace: true })
        return
      }

      try {
        // Fetch job to get project_id
        const job = await jobs.get(jobId)
        const projectId = job.project_id

        if (!projectId) {
          console.error('[LegacyJobRedirect] Job has no project_id')
          navigate('/app/dashboard', { replace: true })
          return
        }

        // Redirect to new project-based URL with job query param
        navigate(`/app/projects/${projectId}/boq?job=${jobId}`, {
          replace: true,
        })
      } catch (error) {
        console.error('[LegacyJobRedirect] Failed to redirect:', error)
        // Fallback to dashboard on error
        navigate('/app/dashboard', { replace: true })
      }
    }

    redirect()
  }, [jobId, navigate])

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography variant="body2" color="text.secondary">
        Redirecting to project view...
      </Typography>
    </Box>
  )
}
