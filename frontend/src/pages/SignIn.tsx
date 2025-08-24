import { useState } from 'react'
import { Box, Button, TextField, Typography, Alert } from '@mui/material'
import { useAuth } from '../hooks/useAuth'

export default function SignIn() {
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('admin123')
  const { login, error, loading } = useAuth()

  const submit = async ()=>{
    const ok = await login(email, password)
    if (ok) window.location.href = '/app/dashboard'
  }

  return (
    <Box sx={{maxWidth:380, mx:'auto'}}>
      <Typography variant="h5" sx={{mb:2}}>Sign in</Typography>
      <TextField fullWidth label="Email" value={email} onChange={(e)=>setEmail(e.target.value)} sx={{mb:2}} />
      <TextField fullWidth type="password" label="Password" value={password} onChange={(e)=>setPassword(e.target.value)} sx={{mb:2}} />
      <Button variant="contained" fullWidth onClick={submit} disabled={loading}>Sign in</Button>
      <Typography variant="body2" sx={{mt:2}}>Tip: call <code>/auth/seed-admin</code> on the backend once to create the demo user.</Typography>
      {error && <Alert severity="error" sx={{mt:2}}>{error}</Alert>}
    </Box>
  )
}
