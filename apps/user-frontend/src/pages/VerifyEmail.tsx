import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Box, Paper, Typography, CircularProgress, Alert, Button, Stack } from '@mui/material'
import { CheckCircle, Error as ErrorIcon } from '@mui/icons-material'
import { auth } from '../services/api'

export default function VerifyEmail() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verifiedEmail, setVerifiedEmail] = useState('')

  useEffect(() => {
    if (!token) {
      setError('Invalid verification link')
      setLoading(false)
      return
    }

    const verify = async () => {
      try {
        const result = await auth.verifyEmail(token)
        setVerifiedEmail(result.email)
        setSuccess(true)

        // Auto-redirect to onboarding after 3 seconds
        setTimeout(() => {
          navigate('/onboarding')
        }, 3000)
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Verification failed')
      } finally {
        setLoading(false)
      }
    }

    verify()
  }, [token, navigate])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2 }}>
        <Paper sx={{ maxWidth: 500, p: 4, textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h5" sx={{ mb: 1 }}>
            Verifying Your Email...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please wait while we confirm your email address
          </Typography>
        </Paper>
      </Box>
    )
  }

  if (success) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2 }}>
        <Paper sx={{ maxWidth: 500, p: 4, textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
            Email Verified!
          </Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Your email address has been verified successfully.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {verifiedEmail}
          </Typography>

          <Alert severity="success" sx={{ mb: 3, textAlign: 'left' }}>
            <strong>You're all set!</strong>
            <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
              <li>Your account is now active</li>
              <li>You have 2,000 free trial credits</li>
              <li>You can start uploading files</li>
            </ul>
          </Alert>

          <Stack spacing={2}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/onboarding')}
            >
              Start Onboarding
            </Button>
            <Typography variant="caption" color="text.secondary">
              Redirecting automatically in a few seconds...
            </Typography>
          </Stack>
        </Paper>
      </Box>
    )
  }

  // Error state
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2 }}>
      <Paper sx={{ maxWidth: 500, p: 4, textAlign: 'center' }}>
        <ErrorIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
          Verification Failed
        </Typography>
        <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
          {error}
        </Alert>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Common issues:
          <ul style={{ textAlign: 'left', marginTop: 8 }}>
            <li>Link has expired (links are valid for 24 hours)</li>
            <li>Link has already been used</li>
            <li>Invalid or malformed link</li>
          </ul>
        </Typography>

        <Stack spacing={2}>
          <Button
            variant="contained"
            component={Link}
            to="/app/signin"
          >
            Back to Sign In
          </Button>
          <Button
            variant="outlined"
            component={Link}
            to="/app/signup"
          >
            Create New Account
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}
