import { AppBar, Toolbar, Typography, IconButton, Box, InputBase, Chip } from '@mui/material'
import { DarkMode, LightMode, Search } from '@mui/icons-material'
import { useColorMode } from '../hooks/useColorMode'

interface NavbarProps {
  title: string
  onSearchClick?: () => void
}

export default function Navbar({ title, onSearchClick }: NavbarProps) {
  const { mode, toggleMode } = useColorMode()

  // Detect OS for keyboard shortcut display
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const shortcutKey = isMac ? '⌘' : 'Ctrl'

  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
      <Toolbar sx={{ gap: 2, px: 3 }}>
        <Typography variant="h6" sx={{ minWidth: 150, whiteSpace: 'nowrap' }}>{title}</Typography>

        {/* Search Bar with Cmd+K hint - expanded to fill available space */}
        <Box
          onClick={onSearchClick}
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderRadius: 2,
            px: 2,
            py: 0.75,
            cursor: 'pointer',
            transition: 'all 0.2s',
            border: '1px solid',
            borderColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            '&:hover': {
              bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              borderColor: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
            },
          }}
        >
          <Search sx={{ mr: 1.5, color: 'text.secondary', fontSize: 20 }} />
          <InputBase
            placeholder="Search projects, tasks, team, files..."
            readOnly
            sx={{
              flex: 1,
              cursor: 'pointer',
              '& input': {
                cursor: 'pointer',
                '&::placeholder': {
                  opacity: 0.7,
                },
              },
            }}
          />
          <Chip
            label={`${shortcutKey}K`}
            size="small"
            sx={{
              height: 24,
              fontSize: 12,
              fontWeight: 600,
              bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              color: 'text.secondary',
              borderRadius: 1,
              '& .MuiChip-label': {
                px: 1,
              },
            }}
          />
        </Box>

        {/* Dark mode toggle on the right */}
        <IconButton
          onClick={toggleMode}
          color="inherit"
          aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
        >
          {mode === 'dark' ? <LightMode /> : <DarkMode />}
        </IconButton>
      </Toolbar>
    </AppBar>
  )
}
