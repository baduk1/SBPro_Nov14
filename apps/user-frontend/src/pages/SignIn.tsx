import { useState } from 'react'
import { Box, Button, TextField, Typography, Alert } from '@mui/material'
import { useAuth } from '../hooks/useAuth'

export default function SignIn() {
  const [email, setEmail] = useState('test')
  const [password, setPassword] = useState('')
  const { login, loading, error } = useAuth()

  const submit = async ()=>{
    const success = await login(email, password)
    if (success) {
      window.location.href = '/app/dashboard'
    }
  }

  return (
    <Box sx={{maxWidth:380, mx:'auto', mt: 4}}>
      <Typography variant="h5" sx={{mb:1}}>Sign in</Typography>
      <Alert severity="info" sx={{mb:3}}>
        Demo mode: use email <strong>"test"</strong> (any password)
      </Alert>
      <TextField fullWidth label="Email" value={email} onChange={(e)=>setEmail(e.target.value)} sx={{mb:2}} />
      <TextField fullWidth type="password" label="Password" value={password} onChange={(e)=>setPassword(e.target.value)} sx={{mb:2}} />
      <Button variant="contained" fullWidth onClick={submit} disabled={loading}>Sign in</Button>
      {error && <Alert severity="error" sx={{mt:2}}>{error}</Alert>}
    </Box>
  )
}
