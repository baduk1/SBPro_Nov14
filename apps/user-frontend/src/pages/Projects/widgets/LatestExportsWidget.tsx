/**
 * LatestExportsWidget Component
 *
 * Displays recent exports/artifacts with download links.
 * Shows up to 5 most recent exports.
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
  IconButton,
  Skeleton,
  Alert,
  Box,
} from '@mui/material'
import {
  Download as DownloadIcon,
  Description as FileIcon,
} from '@mui/icons-material'
import { jobs, artifacts, Artifact } from '../../../services/api'

interface LatestExportsWidgetProps {
  projectId: string
}

export default function LatestExportsWidget({ projectId }: LatestExportsWidgetProps) {
  const [exports, setExports] = useState<Artifact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLatestExports = async () => {
      setLoading(true)
      setError(null)

      try {
        // Get all jobs for this project
        const allJobs = await jobs.list()
        const projectJobs = allJobs.filter((job) => job.project_id === projectId)

        if (projectJobs.length === 0) {
          setExports([])
          setLoading(false)
          return
        }

        // Fetch artifacts for all project jobs
        const artifactsPromises = projectJobs.map((job) => jobs.artifacts(job.id))
        const artifactsArrays = await Promise.all(artifactsPromises)

        // Flatten and take latest 5
        const allArtifacts = artifactsArrays.flat()
        const latestArtifacts = allArtifacts.slice(0, 5)

        setExports(latestArtifacts)
      } catch (err) {
        console.error('[LatestExportsWidget] Failed to fetch exports:', err)
        setError('Failed to load exports')
      } finally {
        setLoading(false)
      }
    }

    fetchLatestExports()
  }, [projectId])

  const handleDownload = async (artifact: Artifact) => {
    try {
      const { url } = await artifacts.presign(artifact.id)
      window.open(url, '_blank')
    } catch (err) {
      console.error('[LatestExportsWidget] Failed to download artifact:', err)
      alert('Failed to download file')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileLabel = (artifact: Artifact) => {
    const extension = artifact.kind.toUpperCase()
    const size = formatFileSize(artifact.size)
    return `${extension} Export - ${size}`
  }

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Latest Exports
          </Typography>
          {[1, 2, 3].map((i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
              <Skeleton variant="text" width="70%" />
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
            Latest Exports
          </Typography>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    )
  }

  if (exports.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Latest Exports
          </Typography>
          <Alert severity="info">
            No exports yet. Generate an export from the BoQ page.
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Latest Exports
        </Typography>
        <List dense disablePadding>
          {exports.map((artifact) => (
            <ListItem
              key={artifact.id}
              disableGutters
              secondaryAction={
                <IconButton
                  edge="end"
                  aria-label="download"
                  onClick={() => handleDownload(artifact)}
                  size="small"
                >
                  <DownloadIcon />
                </IconButton>
              }
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <FileIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={getFileLabel(artifact)}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  )
}
