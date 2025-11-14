import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Box, Link } from '@mui/material'
import Navbar from './components/Navbar'
import GlobalSearch from './components/GlobalSearch'

export default function Shell() {
  const title = "SkyBuild Pro"
  const [searchOpen, setSearchOpen] = useState(false)

  // Global keyboard shortcut: Cmd+K (Mac) or Ctrl+K (Windows/Linux)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <Box sx={{display:'flex', flexDirection:'column', minHeight:'100vh'}}>
      {/* Skip to main content link for keyboard navigation */}
      <Link
        href="#main-content"
        sx={{
          position: 'absolute',
          left: '-9999px',
          zIndex: 9999,
          padding: '1rem',
          backgroundColor: 'primary.main',
          color: 'white',
          textDecoration: 'none',
          borderRadius: 1,
          '&:focus': {
            left: '1rem',
            top: '1rem',
          },
        }}
      >
        Skip to main content
      </Link>

      <Navbar title={title} onSearchClick={() => setSearchOpen(true)} />

      <Box
        id="main-content"
        component="main"
        sx={{p:2, flex:1}}
        role="main"
        aria-label="Main content"
      >
        <Outlet />
      </Box>

      <Box component="footer" sx={{p:2, textAlign:'center', borderTop:'1px solid', borderColor:'divider'}}>
        © {new Date().getFullYear()} SkyBuild Pro • All rights reserved
      </Box>

      {/* Global Spotlight-like Search */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </Box>
  )
}
