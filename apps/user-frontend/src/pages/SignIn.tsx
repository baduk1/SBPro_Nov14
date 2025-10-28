import { useState, useEffect } from 'react'
import { Box, Button, TextField, Typography, Alert, Link } from '@mui/material'
import { useAuth } from '../hooks/useAuth'
import api from '../services/api'

export default function SignIn() {
  // Only use demo email in development mode
  const [email, setEmail] = useState(import.meta.env.DEV ? 'test' : '')
  const [password, setPassword] = useState('')
  const { login, loading, error } = useAuth()
  
  // Resend verification state
  const [showResend, setShowResend] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  // Check if error is "Email not verified" (403)
  useEffect(() => {
    if (error && error.toLowerCase().includes('not verified')) {
      setShowResend(true)
    } else {
      setShowResend(false)
    }
  }, [error])

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  const submit = async ()=>{
    const success = await login(email, password)
    if (success) {
      window.location.href = '/app/dashboard'
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || !email) return
    
    setResendLoading(true)
    setResendError('')
    setResendSuccess(false)
    
    try {
      await api.auth.resendVerification(email)
      setResendSuccess(true)
      setCooldown(60) // 60 second cooldown
    } catch (err: any) {
      // Handle 429 throttle error from server
      if (err?.response?.status === 429) {
        setResendError('Please wait before requesting another email.')
        setCooldown(60)
      } else {
        setResendError(err?.response?.data?.detail || 'Failed to resend email')
      }
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <Box sx={{maxWidth:380, mx:'auto', mt: 4}}>
      <Typography variant="h5" sx={{mb:1}}>Sign in</Typography>
      {/* Only show demo alert in development mode */}
      {import.meta.env.DEV && (
        <Alert severity="info" sx={{mb:3}}>
          Demo mode: use email <strong>"test"</strong> (any password)
        </Alert>
      )}
      <TextField fullWidth label="Email" value={email} onChange={(e)=>setEmail(e.target.value)} sx={{mb:2}} />
      <TextField fullWidth type="password" label="Password" value={password} onChange={(e)=>setPassword(e.target.value)} sx={{mb:2}} />
      <Button variant="contained" fullWidth onClick={submit} disabled={loading}>Sign in</Button>
      
      {error && <Alert severity="error" sx={{mt:2}}>{error}</Alert>}
      
      {/* Resend verification section */}
      {showResend && (
        <Box sx={{mt:2, textAlign:'center'}}>
          <Typography variant="body2" color="text.secondary" sx={{mb:1}}>
            Didn't receive the verification email?
          </Typography>
          <Button
            size="small"
            onClick={handleResend}
            disabled={resendLoading || cooldown > 0}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Verification Email'}
          </Button>
        </Box>
      )}
      
      {resendSuccess && (
        <Alert severity="success" sx={{mt:2}}>
          Verification email sent! Please check your inbox.
        </Alert>
      )}
      
      {resendError && (
        <Alert severity="error" sx={{mt:2}}>
          {resendError}
        </Alert>
      )}
    </Box>
  )
}
