/**
 * ProjectLayout Component
 *
 * Persistent project shell with left sidebar navigation and header.
 * Wraps all /app/projects/:id/* routes.
 */

import { useState } from 'react'
import { Outlet, useParams, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Alert,
} from '@mui/material'
import {
  Dashboard as OverviewIcon,
  TableChart as BoqIcon,
  CloudUpload as UploadIcon,
  Receipt as EstimatesIcon,
  Group as TeamIcon,
  ListAlt as TasksIcon,
  ViewKanban as KanbanIcon,
  Timeline as TimelineIcon,
  History as HistoryIcon,
  InsertDriveFile as FilesIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material'
import PresenceBar from '../components/collaboration/PresenceBar'
import NotificationsBell from '../components/collaboration/NotificationsBell'
import { useProjectRoom } from '../contexts/WebSocketContext'
import { useProjectContext } from '../hooks/useProjectContext'

const DRAWER_WIDTH = 240

const NAV_ITEMS = [
  { to: 'overview', label: 'Overview', icon: <OverviewIcon /> },
  { to: 'upload', label: 'Upload', icon: <UploadIcon /> },
  { to: 'boq', label: 'BoQ', icon: <BoqIcon /> },
  { to: 'estimates', label: 'Estimates', icon: <EstimatesIcon /> },
  { to: 'team', label: 'Team', icon: <TeamIcon /> },
  { to: 'tasks', label: 'Tasks', icon: <TasksIcon /> },
  { to: 'kanban', label: 'Kanban', icon: <KanbanIcon /> },
  { to: 'timeline', label: 'Timeline', icon: <TimelineIcon /> },
  { to: 'history', label: 'History', icon: <HistoryIcon /> },
  { to: 'files', label: 'Files', icon: <FilesIcon /> },
  { to: 'settings', label: 'Settings', icon: <SettingsIcon /> },
]

export default function ProjectLayout() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const [mobileOpen, setMobileOpen] = useState(false)

  // Use project context hook for data, loading, error
  const { project, loading, error } = useProjectContext(id || null)

  // Join WebSocket project room for presence
  useProjectRoom(id || null)

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleNavClick = () => {
    if (isMobile) {
      setMobileOpen(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Failed to load project
          </Typography>
          <Typography variant="body2">
            {error.message || 'An error occurred while loading the project.'}
          </Typography>
        </Alert>
        <IconButton onClick={() => navigate('/app/dashboard')} aria-label="back to dashboard">
          <BackIcon />
          <Typography sx={{ ml: 1 }}>Back to Dashboard</Typography>
        </IconButton>
      </Box>
    )
  }

  // Determine active nav item
  const activeTab = NAV_ITEMS.find((item) =>
    location.pathname.endsWith(`/${item.to}`)
  )?.to

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <List dense sx={{ pt: 0 }}>
        {NAV_ITEMS.map((item) => (
          <ListItemButton
            key={item.to}
            component={Link}
            to={`/app/projects/${id}/${item.to}`}
            selected={activeTab === item.to}
            onClick={handleNavClick}
            sx={{
              borderRadius: 1,
              mx: 1,
              my: 0.5,
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '& .MuiListItemIcon-root': {
                  color: 'primary.contrastText',
                },
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
              aria-label="open drawer"
            >
              <MenuIcon />
            </IconButton>
          )}
          <IconButton
            edge="start"
            onClick={() => navigate('/app/dashboard')}
            sx={{ mr: 1 }}
            aria-label="back to dashboard"
          >
            <BackIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            {project?.name || 'Project'}
          </Typography>
          <NotificationsBell />
          {id && <PresenceBar projectId={id} />}
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile
            }}
            sx={{
              '& .MuiDrawer-paper': {
                width: DRAWER_WIDTH,
                boxSizing: 'border-box',
                mt: '64px',
              },
            }}
          >
            {drawerContent}
          </Drawer>
        ) : (
          /* Desktop drawer */
          <Drawer
            variant="permanent"
            sx={{
              '& .MuiDrawer-paper': {
                width: DRAWER_WIDTH,
                boxSizing: 'border-box',
                mt: '64px',
                borderRight: '1px solid',
                borderColor: 'divider',
              },
            }}
            open
          >
            {drawerContent}
          </Drawer>
        )}
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: '64px',
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}
