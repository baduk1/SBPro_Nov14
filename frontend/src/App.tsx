import { Outlet, Link, useLocation } from 'react-router-dom'
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material'
import Navbar from './components/Navbar'

export default function Shell() {
  const location = useLocation()
  const title = "Blueprint Estimator Hub"
  return (
    <Box sx={{display:'flex', flexDirection:'column', minHeight:'100vh'}}>
      <Navbar title={title} />
      <Box sx={{p:2, flex:1}}>
        <Outlet />
      </Box>
      <Box sx={{p:2, textAlign:'center', borderTop:'1px solid', borderColor:'divider'}}>
        © {new Date().getFullYear()} • Demo MVP
      </Box>
    </Box>
  )
}
