import { useEffect, useState } from 'react'
import { Box, Typography, Paper, Stack, Button, Chip, Grid, Card, CardContent, IconButton, Snackbar } from '@mui/material'
import { Link, useNavigate } from 'react-router-dom'
import {
  Business as BusinessIcon,
  Description as DescriptionIcon,
  Share as ShareIcon,
  AccountBalance as CreditsIcon
} from '@mui/icons-material'
import { suppliers, auth, User, projects, Project } from '../services/api'
import CreateProjectDialog from '../components/CreateProjectDialog'

export default function Dashboard() {
  const navigate = useNavigate()
  const [projectsList, setProjectsList] = useState<Project[]>([])
  const [suppliersCount, setSuppliersCount] = useState<number>(0)
  const [user, setUser] = useState<User | null>(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '' })
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const handleShare = (projectId: string) => {
    const link = `${window.location.origin}/app/projects/${projectId}/overview`
    navigator.clipboard.writeText(link).then(() => {
      setSnackbar({ open: true, message: 'Project link copied to clipboard!' })
    }).catch(() => {
      setSnackbar({ open: true, message: 'Failed to copy link' })
    })
  }

  useEffect(() => {
    // Check if user has completed onboarding
    const onboardingComplete = localStorage.getItem('onboarding_complete')
    if (!onboardingComplete) {
      // Redirect to onboarding for new users
      navigate('/onboarding')
      return
    }

    let alive = true
    const load = async () => {
      try {
        const data = await projects.list()
        if (alive) setProjectsList(data)
      } catch {/* ignore */}
    }
    const loadSuppliers = async () => {
      try {
        const data = await suppliers.list()
        if (alive) setSuppliersCount(data.length)
      } catch {/* ignore */}
    }
    const loadUser = async () => {
      try {
        const data = await auth.me()
        if (alive) setUser(data)
      } catch {/* ignore */}
    }
    load()
    loadSuppliers()
    loadUser()
    const t = setInterval(load, 10000)
    return ()=>{ alive = false; clearInterval(t) }
  }, [navigate])

  const quickActions = [
    {
      title: 'Suppliers',
      description: suppliersCount > 0 ? `${suppliersCount} suppliers` : 'Manage suppliers',
      icon: <BusinessIcon sx={{ fontSize: 40 }} color="primary" />,
      link: '/app/suppliers',
      color: '#1976d2'
    },
    {
      title: 'Templates',
      description: 'Reusable BoQ templates',
      icon: <DescriptionIcon sx={{ fontSize: 40 }} color="success" />,
      link: '/app/templates',
      color: '#2e7d32'
    }
  ]

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ mb: 1 }}>Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">
            Welcome back{user?.full_name ? `, ${user.full_name}` : ''}! Here's your project overview
          </Typography>
        </Box>
        {user && (
          <Chip
            icon={<CreditsIcon />}
            label={`${user.credits_balance.toLocaleString()} Credits`}
            color={user.credits_balance < 500 ? 'warning' : 'success'}
            sx={{ fontWeight: 600, fontSize: '1rem', py: 2.5, px: 1 }}
          />
        )}
      </Box>
      <Box sx={{ mb: 4 }} />

      {/* Projects Section */}
      <Box sx={{ mb: 5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={600}>Projects</Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => setCreateDialogOpen(true)}
            sx={{ px: 3 }}
          >
            + Add New Project
          </Button>
        </Stack>

        {projectsList.length > 0 ? (
          <Grid
            container
            spacing={3}
            sx={{
              justifyContent: projectsList.length === 1 ? 'center' : 'flex-start'
            }}
          >
            {projectsList.map(project => {
              // Calculate column size based on number of projects
              let colSize = 12
              if (projectsList.length === 1) colSize = 6 // Single project: centered, half width
              else if (projectsList.length === 2) colSize = 6 // Two projects: each half
              else if (projectsList.length === 3) colSize = 4 // Three projects: each third
              else colSize = 3 // Four or more: each quarter

              return (
                <Grid item xs={12} sm={colSize > 6 ? 6 : colSize} md={colSize} key={project.id}>
                  <Card
                    sx={{
                      height: '100%',
                      transition: 'all 0.2s',
                      border: '2px solid',
                      borderColor: 'divider',
                      '&:hover': {
                        transform: 'translateY(-6px)',
                        boxShadow: 10,
                        borderColor: 'primary.main'
                      }
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h5" gutterBottom fontWeight={600}>
                        {project.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Created {project.created_at ? new Date(project.created_at).toLocaleDateString() : 'Recently'}
                      </Typography>
                      <Stack spacing={1.5}>
                        <Button
                          variant="contained"
                          size="large"
                          fullWidth
                          onClick={() => navigate(`/app/projects/${project.id}/overview`)}
                        >
                          Open Project
                        </Button>
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="outlined"
                            size="medium"
                            fullWidth
                            onClick={() => navigate(`/app/projects/${project.id}/boq`)}
                          >
                            Open BoQ
                          </Button>
                          <IconButton
                            onClick={() => handleShare(project.id)}
                            aria-label="Share project link"
                            color="primary"
                            sx={{
                              border: '1px solid',
                              borderColor: 'divider',
                              '&:hover': { borderColor: 'primary.main' }
                            }}
                          >
                            <ShareIcon />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        ) : (
          <Paper
            sx={{
              p: 6,
              textAlign: 'center',
              border: '2px dashed',
              borderColor: 'divider',
              bgcolor: 'background.default'
            }}
          >
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              No projects yet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Get started by creating your first project
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/app/upload')}
              sx={{ px: 4 }}
            >
              + Create First Project
            </Button>
          </Paper>
        )}
      </Box>

      {/* Quick Actions Grid - Centered and larger */}
      <Typography variant="h5" sx={{ mb: 3, mt: 5 }}>Resources</Typography>
      <Grid container spacing={3} sx={{ mb: 5, justifyContent: 'center' }}>
        {quickActions.map((action) => (
          <Grid item xs={12} sm={6} md={5} key={action.title}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s',
                height: '100%',
                background: `linear-gradient(135deg, ${action.color}15 0%, transparent 100%)`,
                border: '2px solid',
                borderColor: 'divider',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 8,
                  borderColor: action.color
                }
              }}
              onClick={() => navigate(action.link)}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: `${action.color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {action.icon}
                    </Box>
                    <Box flex={1}>
                      <Typography variant="h5" fontWeight={600}>
                        {action.title}
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                        {action.description}
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        message={snackbar.message}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      <CreateProjectDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={(projectId) => {
          setCreateDialogOpen(false)
          navigate(`/app/projects/${projectId}/overview`)
        }}
      />
    </Box>
  )
}
