import { Outlet } from 'react-router-dom'
import { Box } from '@mui/material'
import Navbar from './components/Navbar'

export default function Shell() {
  const title = "SkyBuild Pro"
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
