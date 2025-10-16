import { AppBar, Toolbar, Typography, Button, IconButton } from '@mui/material'
import { DarkMode, LightMode } from '@mui/icons-material'
import { Link } from 'react-router-dom'
import { useColorMode } from '../hooks/useColorMode'

export default function Navbar({ title }: { title: string }) {
  const { mode, toggleMode } = useColorMode()

  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>{title}</Typography>
        <Button color="inherit" component={Link} to="/app/dashboard">Dashboard</Button>
        <Button color="inherit" component={Link} to="/app/upload">Upload</Button>
        <IconButton
          onClick={toggleMode}
          color="inherit"
          aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
          sx={{ ml: 1 }}
        >
          {mode === 'dark' ? <LightMode /> : <DarkMode />}
        </IconButton>
      </Toolbar>
    </AppBar>
  )
}
