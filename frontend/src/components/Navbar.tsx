import { AppBar, Toolbar, Typography, Button } from '@mui/material'
import { Link } from 'react-router-dom'

export default function Navbar({ title }: { title: string }) {
  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>{title}</Typography>
        <Button color="inherit" component={Link} to="/app/dashboard">Dashboard</Button>
        <Button color="inherit" component={Link} to="/app/upload">Upload</Button>
        <Button color="inherit" component={Link} to="/app/admin/price-lists">Price Lists</Button>
        <Button color="inherit" component={Link} to="/app/admin/mappings">Mappings</Button>
        <Button color="inherit" component={Link} to="/app/admin/access-requests">Access</Button>
      </Toolbar>
    </AppBar>
  )
}
