/**
 * ProjectFiles Component
 *
 * Displays all uploaded files for a project with their:
 * - Filename
 * - Type (IFC, PDF, DWG, DXF)
 * - Size
 * - Upload date
 * - Associated jobs
 */

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Container,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Box,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material'
import {
  Upload as UploadIcon,
  Description as FileIcon,
  InsertDriveFile,
  PictureAsPdf,
  Architecture,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'

interface File {
  id: string
  filename: string
  type: string
  size: number
  created_at: string
  project_id: string
  user_id: string
}

interface Job {
  id: string
  file_id: string
  status: string
  created_at: string
}

export default function ProjectFiles() {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Fetch files for this project
  const { data: files, isLoading, error } = useQuery({
    queryKey: ['project-files', projectId],
    queryFn: async () => {
      const res = await api.get<File[]>(`/projects/${projectId}/files`)
      return res.data
    },
    enabled: !!projectId,
  })

  // Fetch jobs to show which files have been processed
  const { data: jobs } = useQuery({
    queryKey: ['jobs', projectId],
    queryFn: async () => {
      const res = await api.get<Job[]>('/jobs')
      return res.data
    },
  })

  const handleUpload = () => {
    navigate(`/app/upload?project=${projectId}`)
  }

  const getFileIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'PDF':
        return <PictureAsPdf color="error" />
      case 'IFC':
        return <Architecture color="primary" />
      case 'DWG':
      case 'DXF':
        return <InsertDriveFile color="info" />
      default:
        return <FileIcon />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getFileJobs = (fileId: string) => {
    return jobs?.filter(j => j.file_id === fileId) || []
  }

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return 'success'
      case 'FAILED':
        return 'error'
      case 'RUNNING':
      case 'PROCESSING':
        return 'warning'
      default:
        return 'default'
    }
  }

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">
          Failed to load files. Please try again.
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Project Files
        </Typography>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={handleUpload}
        >
          Upload File
        </Button>
      </Stack>

      {!files || files.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <FileIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No files uploaded yet
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Upload IFC, PDF, DWG, or DXF files to start extracting quantities
          </Typography>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={handleUpload}
          >
            Upload Your First File
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Filename</TableCell>
                <TableCell align="right">Size</TableCell>
                <TableCell>Uploaded</TableCell>
                <TableCell>Jobs</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {files.map((file) => {
                const fileJobs = getFileJobs(file.id)
                return (
                  <TableRow key={file.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {getFileIcon(file.type)}
                        <Chip
                          label={file.type}
                          size="small"
                          color={file.type === 'PDF' ? 'error' : 'primary'}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {file.filename}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {formatFileSize(file.size)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(file.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {fileJobs.length === 0 ? (
                        <Chip label="Not processed" size="small" variant="outlined" />
                      ) : (
                        <Stack direction="row" spacing={1}>
                          {fileJobs.map((job) => (
                            <Chip
                              key={job.id}
                              label={job.status}
                              size="small"
                              color={getStatusColor(job.status) as any}
                              onClick={() => navigate(`/app/jobs/${job.id}`)}
                              clickable
                            />
                          ))}
                        </Stack>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          // Create new job for this file
                          navigate(`/app/upload?project=${projectId}`)
                        }}
                      >
                        Process Again
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Box mt={3}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>Supported formats:</strong> IFC (3D models), PDF (drawings/plans), DWG/DXF (AutoCAD)
          </Typography>
          <Typography variant="body2" mt={1}>
            Each file can be processed multiple times with different settings or price lists.
          </Typography>
        </Alert>
      </Box>
    </Container>
  )
}
