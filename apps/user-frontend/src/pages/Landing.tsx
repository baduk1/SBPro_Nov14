import { Box, Button, Container, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import AccessRequestForm from '../components/AccessRequestForm'

export default function Landing() {
  return (
    <Box sx={{
      minHeight:'100vh', display:'flex', alignItems:'center',
      background: 'radial-gradient(circle at 20% 20%, rgba(0,229,168,0.15), transparent 40%), radial-gradient(circle at 80% 0%, rgba(0,188,212,0.15), transparent 40%)'
    }}>
      <Container sx={{py:6}}>
        <Typography variant="h3" sx={{fontWeight:800, mb:2}}>SkyBuild Pro</Typography>
        <Typography variant="h6" sx={{opacity:0.85, mb:4, maxWidth:800}}>
          Upload apartment/interior DWG or IFC and get an audit‑ready, priced Bill of Quantities in minutes.
        </Typography>
        <Box sx={{display:'flex', gap:2, mb:6}}>
          <Button variant="contained" component={Link} to="/app/signup">Start Free Trial</Button>
          <Button variant="outlined" component={Link} to="/app/signin">Sign In</Button>
        </Box>

        <Typography variant="h5" sx={{mb:1}}>Request Access</Typography>
        <AccessRequestForm />
      </Container>
    </Box>
  )
}
