import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  Stack,
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material'
import { Visibility, VisibilityOff, CheckCircle } from '@mui/icons-material'
import { auth } from '../services/api'

export default function SignUp() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value })
    setError(null)
  }

  const validateForm = () => {
    if (!formData.email) {
      setError('Email is required')
      return false
    }
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email address')
      return false
    }
    if (!formData.password) {
      setError('Password is required')
      return false
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      await auth.register(formData.email, formData.password, formData.fullName || undefined)
      setRegisteredEmail(formData.email)
      setSuccess(true)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setLoading(true)
    setError(null)

    try {
      await auth.resendVerification(registeredEmail)
      setError(null)
      alert('Verification email sent! Please check your inbox.')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to resend verification email')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2 }}>
        <Paper sx={{ maxWidth: 500, p: 4, textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
            Check Your Email
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
            We've sent a verification link to:
          </Typography>
          <Typography variant="h6" sx={{ mb: 3, color: 'primary.main' }}>
            {registeredEmail}
          </Typography>
          <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
            <strong>Next steps:</strong>
            <ol style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
              <li>Check your inbox (and spam folder)</li>
              <li>Click the verification link in the email</li>
              <li>Sign in and start using SkyBuild Pro</li>
            </ol>
          </Alert>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Didn't receive the email?
          </Typography>
          <Stack spacing={2}>
            <Button
              variant="outlined"
              onClick={handleResendVerification}
              disabled={loading}
            >
              Resend Verification Email
            </Button>
            <Button
              variant="text"
              component={Link}
              to="/app/signin"
            >
              Back to Sign In
            </Button>
          </Stack>
        </Paper>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2 }}>
      <Paper sx={{ maxWidth: 450, width: '100%', p: 4 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
          Create Account
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
          Start your free trial with 2,000 credits
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Full Name"
              type="text"
              fullWidth
              value={formData.fullName}
              onChange={handleChange('fullName')}
              placeholder="John Doe"
            />

            <TextField
              label="Email Address"
              type="email"
              fullWidth
              required
              value={formData.email}
              onChange={handleChange('email')}
              placeholder="you@company.com"
              autoComplete="email"
            />

            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              required
              value={formData.password}
              onChange={handleChange('password')}
              placeholder="At least 8 characters"
              autoComplete="new-password"
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
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              fullWidth
              required
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              placeholder="Re-enter your password"
              autoComplete="new-password"
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
              fullWidth
              disabled={loading}
              sx={{ mt: 2, py: 1.5 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Create Account'}
            </Button>
          </Stack>
        </form>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Link to="/app/signin" style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 600 }}>
              Sign In
            </Link>
          </Typography>
        </Box>

        <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
            Free Trial Includes:
          </Typography>
          <Typography variant="caption" color="text.secondary" component="div">
            • 2,000 credits (≈10 projects)<br />
            • 1 supplier with unlimited price items<br />
            • Export to CSV, Excel, and PDF<br />
            • Email support
          </Typography>
        </Box>
      </Paper>
    </Box>
  )
}
