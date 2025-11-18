import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Box, Paper, Typography, CircularProgress, Alert, Button, Stack } from '@mui/material'
import { CheckCircle, Error as ErrorIcon, GroupAdd, Login, PersonAdd } from '@mui/icons-material'
import api, { collaboration } from '../services/api'
import { extractErrorMessage } from '../utils/errorHandler'

interface ValidationResult {
  valid: boolean
  email: string
  role: string
  project_id: string
  project_name: string
  user_exists: boolean
  user_verified: boolean
}

export default function AcceptInvitation() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projectInfo, setProjectInfo] = useState<{ project_id: string; role: string } | null>(null)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [needsAuth, setNeedsAuth] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link')
      setLoading(false)
      return
    }

    const processInvitation = async () => {
      try {
        // Step 1: Validate token (no auth required)
        const validation = await api.get<ValidationResult>(`/invitations/validate?token=${token}`)
        setValidationResult(validation.data)

        // Step 2: Check if user exists in system
        if (!validation.data.user_exists) {
          // User doesn't exist - redirect to simplified registration
          setLoading(false)
          setNeedsAuth(true)
          return
        }

        // Step 3: Check if current user is logged in
        const currentToken = localStorage.getItem('token')
        if (!currentToken) {
          // User exists but not logged in - show message to log in
          setLoading(false)
          setNeedsAuth(true)
          return
        }

        // Step 4: User exists and is logged in - accept invitation
        const result = await collaboration.acceptInvitation(token)
        setProjectInfo({
          project_id: result.project_id,
          role: result.role,
        })
        setSuccess(true)

        // Auto-redirect to project after 3 seconds
        setTimeout(() => {
          navigate(`/app/projects/${result.project_id}/overview`)
        }, 3000)
      } catch (err: any) {
        setError(extractErrorMessage(err, 'Failed to process invitation'))
      } finally {
        setLoading(false)
      }
    }

    processInvitation()
  }, [token, navigate])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2 }}>
        <Paper sx={{ maxWidth: 500, p: 4, textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h5" sx={{ mb: 1 }}>
            Processing Your Invitation...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please wait while we add you to the project
          </Typography>
        </Paper>
      </Box>
    )
  }

  // Show auth required screen
  if (needsAuth && validationResult) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2 }}>
        <Paper sx={{ maxWidth: 550, p: 4, textAlign: 'center' }}>
          <GroupAdd sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
            Join Project Team
          </Typography>

          <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>You've been invited to:</strong>
            </Typography>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {validationResult.project_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Role: <strong style={{ textTransform: 'capitalize' }}>{validationResult.role}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Email: <strong>{validationResult.email}</strong>
            </Typography>
          </Alert>

          {!validationResult.user_exists ? (
            // User doesn't exist - needs to create account
            <>
              <Typography variant="body1" sx={{ mb: 3 }}>
                To accept this invitation, you need to create an account with <strong>{validationResult.email}</strong>
              </Typography>
              <Stack spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PersonAdd />}
                  onClick={() => navigate(`/complete-invitation?token=${token}`)}
                >
                  Create Account & Join Project
                </Button>
                <Typography variant="caption" color="text.secondary">
                  We'll pre-fill your email address to make it quick
                </Typography>
              </Stack>
            </>
          ) : (
            // User exists - needs to log in
            <>
              <Typography variant="body1" sx={{ mb: 3 }}>
                You already have an account. Please sign in as <strong>{validationResult.email}</strong> to accept this invitation.
              </Typography>
              <Stack spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Login />}
                  onClick={() => {
                    // Save token to complete invitation after login
                    localStorage.setItem('pending_invitation_token', token || '')
                    navigate('/app/signin')
                  }}
                >
                  Sign In to Accept Invitation
                </Button>
                <Typography variant="caption" color="text.secondary">
                  After signing in, you'll be automatically added to the project
                </Typography>
              </Stack>
            </>
          )}
        </Paper>
      </Box>
    )
  }

  if (success && projectInfo) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2 }}>
        <Paper sx={{ maxWidth: 500, p: 4, textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
            Invitation Accepted!
          </Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>
            You have successfully joined the project.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Your role: <strong style={{ textTransform: 'capitalize' }}>{projectInfo.role}</strong>
          </Typography>

          <Alert severity="success" sx={{ mb: 3, textAlign: 'left' }}>
            <strong>You're all set!</strong>
            <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
              <li>You can now access project files and data</li>
              <li>Collaborate with team members in real-time</li>
              <li>Contribute based on your role permissions</li>
            </ul>
          </Alert>

          <Stack spacing={2}>
            <Button
              variant="contained"
              size="large"
              startIcon={<GroupAdd />}
              onClick={() => navigate(`/app/projects/${projectInfo.project_id}/overview`)}
            >
              Go to Project
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
          Invitation Failed
        </Typography>
        <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
          {error}
        </Alert>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Common issues:
          <ul style={{ textAlign: 'left', marginTop: 8 }}>
            <li>Link has expired (invitations are valid for 7 days)</li>
            <li>Link has already been used</li>
            <li>Invitation has been revoked by the project owner</li>
            <li>Invalid or malformed link</li>
          </ul>
        </Typography>

        <Stack spacing={2}>
          <Button
            variant="contained"
            component={Link}
            to="/app/dashboard"
          >
            Go to Dashboard
          </Button>
          <Button
            variant="outlined"
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
