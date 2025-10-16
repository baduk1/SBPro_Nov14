import { Outlet } from 'react-router-dom'
import { Box } from '@mui/material'
import Navbar from './components/Navbar'

export default function Shell() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Box sx={{ p: 2, flex: 1 }}>
        <Outlet />
      </Box>
    </Box>
  )
}
