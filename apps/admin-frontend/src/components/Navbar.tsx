import { AppBar, Toolbar, Typography, Button, IconButton } from '@mui/material'
import { Brightness4 as DarkModeIcon, Brightness7 as LightModeIcon } from '@mui/icons-material'
import { Link } from 'react-router-dom'
import { useColorMode } from '../hooks/useColorMode'

export default function Navbar() {
  const { mode, toggleMode } = useColorMode()

  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>SkyBuild • Admin</Typography>
        <Button color="inherit" component={Link} to="/dashboard">Dashboard</Button>
        <Button color="inherit" component={Link} to="/access-requests">Access</Button>
        <Button color="inherit" component={Link} to="/price-lists">Price Lists</Button>
        <Button color="inherit" component={Link} to="/mappings">Mappings</Button>

        {/* Theme Toggle */}
        <IconButton
          onClick={toggleMode}
          color="inherit"
          aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
          sx={{ ml: 1 }}
        >
          {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      </Toolbar>
    </AppBar>
  )
}
