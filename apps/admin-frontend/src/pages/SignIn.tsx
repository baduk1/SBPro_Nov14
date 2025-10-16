import { useState } from 'react'
import { Alert, Box, Button, TextField, Typography } from '@mui/material'
import { useAdminAuth } from '../hooks/useAdminAuth'

export default function SignIn() {
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('admin123')
  const { login, loading, error } = useAdminAuth()

  const submit = async () => {
    const ok = await login(email, password)
    if (ok) {
      window.location.href = '/dashboard'
    }
  }

  return (
    <Box sx={{ maxWidth: 380, mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Admin sign in</Typography>
      <TextField
        fullWidth
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        sx={{ mb: 2 }}
      />
      <TextField
        fullWidth
        type="password"
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        sx={{ mb: 2 }}
      />
      <Button variant="contained" fullWidth onClick={submit} disabled={loading}>
        Sign in
      </Button>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </Box>
  )
}
