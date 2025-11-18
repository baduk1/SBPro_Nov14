import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Button,
  TextField,
  Stack,
  InputAdornment,
  IconButton,
} from '@mui/material'
import { Visibility, VisibilityOff, GroupAdd, PersonAdd } from '@mui/icons-material'
import api from '../services/api'
import { extractErrorMessage } from '../utils/errorHandler'

interface ValidationResult {
  valid: boolean
  email: string
  role: string
  project_id: string
  project_name: string
  user_exists: boolean
}

export default function CompleteInvitation() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)

  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link')
      setLoading(false)
      return
    }

    const validateToken = async () => {
      try {
        const validation = await api.get<ValidationResult>(`/invitations/validate?token=${token}`)

        if (validation.data.user_exists) {
          // User already exists, redirect to sign in
          navigate(`/accept-invitation?token=${token}`)
          return
        }

        setValidationResult(validation.data)
      } catch (err: any) {
        setError(extractErrorMessage(err, 'Failed to validate invitation'))
      } finally {
        setLoading(false)
      }
    }

    validateToken()
  }, [token, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!fullName.trim()) {
      setError('Please enter your full name')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSubmitting(true)

    try {
      // Step 1: Register the user
      await api.post('/auth/register', {
        email: validationResult?.email,
        password: password,
        full_name: fullName,
      })

      // Step 2: Log in immediately
      const loginData = new URLSearchParams()
      loginData.append('username', validationResult?.email || '')
      loginData.append('password', password)

      const loginResponse = await api.post('/auth/login', loginData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })

      const { access_token } = loginResponse.data
      localStorage.setItem('token', access_token)

      // Set auth header for subsequent requests
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`

      // Step 3: Accept the invitation
      const inviteResponse = await api.post('/join-project', { token })

      // Success! Redirect to project
      navigate(`/app/projects/${inviteResponse.data.project_id}/overview`)
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to create account'))
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2 }}>
        <Paper sx={{ maxWidth: 500, p: 4, textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h5" sx={{ mb: 1 }}>
            Validating Invitation...
          </Typography>
        </Paper>
      </Box>
    )
  }

  if (error && !validationResult) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2 }}>
        <Paper sx={{ maxWidth: 500, p: 4, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ mb: 2, fontWeight: 600, color: 'error.main' }}>
            Invalid Invitation
          </Typography>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button variant="contained" onClick={() => navigate('/')}>
            Go to Home
          </Button>
        </Paper>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2 }}>
      <Paper sx={{ maxWidth: 500, width: '100%', p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <GroupAdd sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
            Complete Your Account
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You've been invited to join a project
          </Typography>
        </Box>

        {validationResult && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Project:</strong> {validationResult.project_name}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Role:</strong> {validationResult.role}
            </Typography>
            <Typography variant="body2">
              <strong>Email:</strong> {validationResult.email}
            </Typography>
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            <TextField
              fullWidth
              label="Email Address"
              value={validationResult?.email || ''}
              disabled
              helperText="This email is from your invitation"
            />

            <TextField
              fullWidth
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              required
              autoFocus
            />

            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              helperText="At least 8 characters"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              type={showConfirmPassword ? 'text' : 'password'}
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} /> : <PersonAdd />}
              sx={{ mt: 2 }}
            >
              {submitting ? 'Creating Account...' : 'Create Account & Join Project'}
            </Button>

            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </Typography>
          </Stack>
        </form>
      </Paper>
    </Box>
  )
}
