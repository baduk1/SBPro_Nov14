import { useEffect, useState } from 'react'
import { Box, Typography, Paper, Stack, Button, Chip, Grid, Card, CardContent, IconButton, Snackbar } from '@mui/material'
import { Link, useNavigate } from 'react-router-dom'
import {
  Business as BusinessIcon,
  Description as DescriptionIcon,
  Receipt as ReceiptIcon,
  CloudUpload as CloudUploadIcon,
  History as HistoryIcon,
  Share as ShareIcon
} from '@mui/icons-material'
import { jobs, Job } from '../services/api'
import { mockSuppliers, mockTemplates, mockEstimates } from '../mocks/mockData'

export default function Dashboard() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Job[]>([])
  const [snackbar, setSnackbar] = useState({ open: false, message: '' })

  const handleShare = (jobId: string) => {
    const link = `${window.location.origin}/app/jobs/${jobId}`
    navigator.clipboard.writeText(link).then(() => {
      setSnackbar({ open: true, message: 'Link copied to clipboard!' })
    }).catch(() => {
      setSnackbar({ open: true, message: 'Failed to copy link' })
    })
  }

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const data = await jobs.list()
        if (alive) setItems(data)
      } catch {/* ignore */}
    }
    load()
    const t = setInterval(load, 5000)
    return ()=>{ alive = false; clearInterval(t) }
  }, [])

  const quickActions = [
    {
      title: 'Suppliers',
      description: `${mockSuppliers.length} suppliers`,
      icon: <BusinessIcon sx={{ fontSize: 40 }} color="primary" />,
      link: '/app/suppliers',
      color: '#1976d2'
    },
    {
      title: 'Templates',
      description: `${mockTemplates.length} templates`,
      icon: <DescriptionIcon sx={{ fontSize: 40 }} color="success" />,
      link: '/app/templates',
      color: '#2e7d32'
    },
    {
      title: 'Estimates',
      description: `${mockEstimates.length} estimates`,
      icon: <ReceiptIcon sx={{ fontSize: 40 }} color="warning" />,
      link: '/app/estimates',
      color: '#ed6c02'
    },
    {
      title: 'Upload File',
      description: 'Start new takeoff',
      icon: <CloudUploadIcon sx={{ fontSize: 40 }} color="info" />,
      link: '/app/upload',
      color: '#0288d1'
    }
  ]

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>Dashboard</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Welcome back! Here's your project overview
      </Typography>

      {/* Quick Actions Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {quickActions.map((action) => (
          <Grid item xs={12} sm={6} md={3} key={action.title}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                }
              }}
              onClick={() => navigate(action.link)}
            >
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  {action.icon}
                  <Box>
                    <Typography variant="h6">{action.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {action.description}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Jobs */}
      <Typography variant="h5" sx={{ mb: 2 }}>Recent Jobs</Typography>
      <Stack spacing={2}>
        {items.map(j => (
          <Paper key={j.id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Typography variant="subtitle1">Job {j.id.slice(0, 8)}</Typography>
              <Typography variant="body2">Project: {j.project_id} • File: {j.file_id}</Typography>
              <Box sx={{ mt: 1 }}><Chip size="small" label={j.status} /></Box>
            </div>
            <Stack direction="row" spacing={1}>
              <IconButton
                onClick={() => handleShare(j.id)}
                aria-label="Share job link"
                size="small"
                color="primary"
              >
                <ShareIcon />
              </IconButton>
              <Button component={Link} to={`/app/jobs/${j.id}`}>Status</Button>
              <Button component={Link} to={`/app/jobs/${j.id}/takeoff`} disabled={j.status !== 'COMPLETED'}>Take‑off</Button>
            </Stack>
          </Paper>
        ))}
        {items.length === 0 && (
          <Paper sx={{ p: 2 }}>
            <Typography>No jobs yet. Upload an IFC file on the Upload page.</Typography>
          </Paper>
        )}
      </Stack>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        message={snackbar.message}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}
