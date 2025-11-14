import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  LinearProgress,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Link as MuiLink,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import {
  FolderOpen,
  Schedule,
  CheckCircle,
  Warning,
  TrendingUp,
  TrendingDown,
  Business,
  Description,
  CloudUpload,
  GroupAdd,
  MoreVert,
  CalendarToday,
  People,
  OpenInNew,
  Article,
  Timeline,
  AccessTime,
  Comment,
  Done,
} from '@mui/icons-material'
import { suppliers, auth, User, projects, Project } from '../services/api'
import CreateProjectDialog from '../components/CreateProjectDialog'

// Demo projects with images
const demoProjects = [
  {
    id: 'demo-1',
    name: 'My First Project',
    description: 'Downtown commercial complex renovation',
    status: 'in-progress',
    progress: 68,
    deadline: 'Dec 30, 2025',
    team: 8,
    image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400',
    recentActivity: 'Updated 2 hours ago',
  },
  {
    id: 'demo-2',
    name: 'Riverside Apartments',
    description: 'New residential building construction',
    status: 'planning',
    progress: 25,
    deadline: 'Feb 15, 2026',
    team: 12,
    image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400',
    recentActivity: 'Updated 1 day ago',
  },
  {
    id: 'demo-3',
    name: 'Tech Hub Office',
    description: 'Modern office space design and build',
    status: 'review',
    progress: 92,
    deadline: 'Nov 20, 2025',
    team: 6,
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400',
    recentActivity: 'Updated 3 hours ago',
  },
]

const statusConfig = {
  'in-progress': { label: 'In Progress', color: 'primary' },
  'planning': { label: 'Planning', color: 'secondary' },
  'review': { label: 'Review', color: 'warning' },
  'completed': { label: 'Completed', color: 'success' },
  'active': { label: 'Active', color: 'primary' },
} as const

const recentActivities = [
  {
    id: 1,
    user: 'Sarah Johnson',
    initials: 'SJ',
    action: 'updated BoQ document',
    project: 'My First Project',
    time: '2 hours ago',
    icon: Article,
    color: '#2196f3',
  },
  {
    id: 2,
    user: 'Mike Chen',
    initials: 'MC',
    action: 'added a comment',
    project: 'Tech Hub Office',
    time: '3 hours ago',
    icon: Comment,
    color: '#4caf50',
  },
  {
    id: 3,
    user: 'Emily Davis',
    initials: 'ED',
    action: 'uploaded blueprints',
    project: 'Riverside Apartments',
    time: '1 day ago',
    icon: CloudUpload,
    color: '#9c27b0',
  },
  {
    id: 4,
    user: 'John Smith',
    initials: 'JS',
    action: 'completed milestone',
    project: 'My First Project',
    time: '2 days ago',
    icon: Done,
    color: '#ff9800',
  },
]

export default function DashboardNew() {
  const navigate = useNavigate()
  const [projectsList, setProjectsList] = useState<Project[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)

  useEffect(() => {
    const onboardingComplete = localStorage.getItem('onboarding_complete')
    if (!onboardingComplete) {
      navigate('/onboarding')
      return
    }

    let alive = true
    const load = async () => {
      try {
        const data = await projects.list()
        if (alive) setProjectsList(data)
      } catch {}
    }
    const loadUser = async () => {
      try {
        const data = await auth.me()
        if (alive) setUser(data)
      } catch {}
    }
    load()
    loadUser()
    const t = setInterval(load, 10000)
    return () => { alive = false; clearInterval(t) }
  }, [navigate])

  // Use demo projects if no real projects
  const displayProjects = projectsList.length > 0
    ? projectsList.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || 'No description',
        status: (p.status || 'active') as keyof typeof statusConfig,
        progress: 0, // Will need to calculate from backend
        deadline: p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A',
        team: 0, // Will need from backend
        image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400',
        recentActivity: 'Recently',
      }))
    : demoProjects

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, projectId: string) => {
    setAnchorEl(event.currentTarget)
    setSelectedProject(projectId)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedProject(null)
  }

  // Calculate stats
  const stats = {
    active: displayProjects.length,
    inProgress: displayProjects.filter(p => p.status === 'in-progress').length,
    completed: 24, // Mock data
    pending: 3, // Mock data
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {user?.full_name || 'User'}! Here's your project overview
        </Typography>
      </Box>

      {/* Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          {
            title: 'Active Projects',
            value: stats.active,
            change: '+2 this month',
            trend: 'up',
            icon: FolderOpen,
            color: '#2196f3',
            bgColor: '#e3f2fd',
          },
          {
            title: 'In Progress',
            value: stats.inProgress,
            change: `${stats.inProgress > 0 ? ((stats.inProgress / stats.active) * 100).toFixed(1) : 0}% of total`,
            trend: 'neutral',
            icon: Schedule,
            color: '#ff9800',
            bgColor: '#fff3e0',
          },
          {
            title: 'Completed',
            value: stats.completed,
            change: '+6 this quarter',
            trend: 'up',
            icon: CheckCircle,
            color: '#4caf50',
            bgColor: '#e8f5e9',
          },
          {
            title: 'Pending Review',
            value: stats.pending,
            change: 'Needs attention',
            trend: 'down',
            icon: Warning,
            color: '#9c27b0',
            bgColor: '#f3e5f5',
          },
        ].map((stat, index) => {
          const Icon = stat.icon
          const TrendIcon = stat.trend === 'up' ? TrendingUp : stat.trend === 'down' ? TrendingDown : null

          return (
            <Grid item xs={12} sm={6} lg={3} key={index}>
              <Card
                sx={{
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: stat.bgColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon sx={{ color: stat.color, fontSize: 28 }} />
                    </Box>
                    {TrendIcon && <TrendIcon sx={{ fontSize: 20, color: stat.trend === 'up' ? 'success.main' : 'error.main' }} />}
                  </Stack>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {stat.title}
                  </Typography>
                  <Typography variant="h4" fontWeight={700} gutterBottom>
                    {stat.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stat.change}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Projects List */}
        <Grid item xs={12} lg={8}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Projects
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage and track your active projects
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<OpenInNew />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Add New Project
            </Button>
          </Box>

          <Stack spacing={2}>
            {displayProjects.map((project) => (
              <Card
                key={project.id}
                sx={{
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: 6,
                    transform: 'scale(1.01)',
                  },
                }}
              >
                <CardContent sx={{ p: 0 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }}>
                    {/* Project Image */}
                    <Box
                      sx={{
                        width: { xs: '100%', sm: 200 },
                        height: { xs: 200, sm: 'auto' },
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        component="img"
                        src={project.image}
                        alt={project.name}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
                        }}
                      />
                      <Chip
                        label={statusConfig[project.status]?.label || 'Active'}
                        color={statusConfig[project.status]?.color || 'primary'}
                        size="small"
                        sx={{ position: 'absolute', top: 12, left: 12 }}
                      />
                    </Box>

                    {/* Project Details */}
                    <Box sx={{ flex: 1, p: 3 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Box>
                          <Typography variant="h6" fontWeight={600} gutterBottom>
                            {project.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {project.description}
                          </Typography>
                        </Box>
                        <IconButton size="small" onClick={(e) => handleMenuOpen(e, project.id)}>
                          <MoreVert />
                        </IconButton>
                      </Stack>

                      {/* Progress */}
                      <Box sx={{ mb: 2 }}>
                        <Stack direction="row" justifyContent="space-between" mb={1}>
                          <Typography variant="body2" color="text.secondary">
                            Progress
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {project.progress}%
                          </Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={project.progress} sx={{ height: 8, borderRadius: 4 }} />
                      </Box>

                      {/* Meta Info */}
                      <Stack direction="row" spacing={3} mb={2} flexWrap="wrap">
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {project.deadline}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <People sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {project.team} members
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <AccessTime sx={{ fontSize: 16, color: 'text.disabled' }} />
                          <Typography variant="caption" color="text.disabled">
                            {project.recentActivity}
                          </Typography>
                        </Stack>
                      </Stack>

                      {/* Actions */}
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<OpenInNew />}
                          onClick={() => navigate(`/app/projects/${project.id}/overview`)}
                        >
                          Open Project
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Article />}
                          onClick={() => navigate(`/app/projects/${project.id}/boq`)}
                        >
                          Open BoQ
                        </Button>
                        <Button variant="text" size="small" startIcon={<Timeline />}>
                          View Analytics
                        </Button>
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            {/* Quick Actions */}
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Quick Actions
                </Typography>
                <Stack spacing={1}>
                  {[
                    { icon: Business, label: 'Suppliers', desc: 'Manage suppliers', color: '#2196f3', link: '/app/suppliers' },
                    { icon: Description, label: 'Templates', desc: 'Reusable BoQ templates', color: '#4caf50', link: '/app/templates' },
                    { icon: CloudUpload, label: 'Upload Files', desc: 'Add documents', color: '#9c27b0', link: '/app/upload' },
                    { icon: GroupAdd, label: 'Invite Team', desc: 'Add members', color: '#ff9800', link: '#' },
                  ].map((action) => {
                    const Icon = action.icon
                    return (
                      <Button
                        key={action.label}
                        fullWidth
                        sx={{
                          justifyContent: 'flex-start',
                          p: 1.5,
                          textAlign: 'left',
                          textTransform: 'none',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                        onClick={() => action.link !== '#' && navigate(action.link)}
                      >
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: 1.5,
                            bgcolor: `${action.color}15`,
                            display: 'flex',
                            mr: 2,
                          }}
                        >
                          <Icon sx={{ fontSize: 20, color: action.color }} />
                        </Box>
                        <Box sx={{ textAlign: 'left' }}>
                          <Typography variant="body2" fontWeight={600}>
                            {action.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {action.desc}
                          </Typography>
                        </Box>
                      </Button>
                    )
                  })}
                </Stack>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" fontWeight={600}>
                    Recent Activity
                  </Typography>
                  <MuiLink href="#" sx={{ fontSize: 14 }}>
                    View all
                  </MuiLink>
                </Stack>
                <Stack spacing={2}>
                  {recentActivities.map((activity) => {
                    const Icon = activity.icon
                    return (
                      <Stack direction="row" spacing={1.5} key={activity.id}>
                        <Box sx={{ position: 'relative' }}>
                          <Avatar sx={{ width: 40, height: 40, bgcolor: 'grey.300', color: 'grey.700' }}>
                            {activity.initials}
                          </Avatar>
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: -2,
                              right: -2,
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              bgcolor: `${activity.color}25`,
                              border: '2px solid white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Icon sx={{ fontSize: 12, color: activity.color }} />
                          </Box>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2">
                            <Box component="span" fontWeight={600}>
                              {activity.user}
                            </Box>{' '}
                            <Box component="span" color="text.secondary">
                              {activity.action}
                            </Box>
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {activity.project}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">
                            {activity.time}
                          </Typography>
                        </Box>
                      </Stack>
                    )
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleMenuClose}>Edit Project</MenuItem>
        <MenuItem onClick={handleMenuClose}>Share</MenuItem>
        <MenuItem onClick={handleMenuClose}>Duplicate</MenuItem>
        <MenuItem onClick={handleMenuClose} sx={{ color: 'error.main' }}>
          Delete
        </MenuItem>
      </Menu>

      {/* Create Project Dialog */}
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
