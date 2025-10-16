import { useState } from 'react'
import {
  Box,
  Button,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  Stack,
  CircularProgress
} from '@mui/material'
import { MailOutline as MailIcon } from '@mui/icons-material'
import api from '../services/api'

export default function AccessRequestForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const submit = async () => {
    try {
      await api.post('/public/access-requests', { name, email, company, message })
    } catch (error) {
      // Mock mode - save to localStorage
      const requests = JSON.parse(localStorage.getItem('accessRequests') || '[]')
      requests.push({
        id: Date.now().toString(),
        name,
        email,
        company,
        message,
        status: 'new',
        created_at: new Date().toISOString()
      })
      localStorage.setItem('accessRequests', JSON.stringify(requests))
    }

    // Show verification modal
    setShowVerification(true)
    setIsVerifying(true)

    // Mock verification delay
    setTimeout(() => {
      setIsVerifying(false)
      localStorage.setItem('emailVerified', email)
      // Auto-close after verification
      setTimeout(() => {
        setShowVerification(false)
        setSubmitted(true)
      }, 2000)
    }, 5000)
  }

  const handleResend = () => {
    if (resendCooldown > 0) return

    setIsVerifying(true)
    setResendCooldown(60)

    // Countdown timer
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Mock resend
    setTimeout(() => {
      setIsVerifying(false)
    }, 2000)
  }

  if (submitted && !showVerification) return <Typography>Thanks! Check your email to verify your account.</Typography>

  return (
    <>
      <Box sx={{display:'grid', gap:2, maxWidth:560}}>
        <TextField
          label="Name"
          value={name}
          onChange={e=>setName(e.target.value)}
          required
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={e=>setEmail(e.target.value)}
          required
        />
        <TextField
          label="Company (optional)"
          value={company}
          onChange={e=>setCompany(e.target.value)}
        />
        <TextField
          label="Message"
          multiline
          rows={3}
          value={message}
          onChange={e=>setMessage(e.target.value)}
        />
        <Button
          variant="contained"
          onClick={submit}
          disabled={!name || !email}
        >
          Request Access
        </Button>
      </Box>

      {/* Email Verification Modal */}
      <Dialog
        open={showVerification}
        onClose={() => {}}
        aria-labelledby="verification-dialog-title"
        disableEscapeKeyDown
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="verification-dialog-title">
          Email Verification
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} alignItems="center" py={2}>
            {isVerifying ? (
              <>
                <CircularProgress size={60} />
                <Typography variant="body1" align="center">
                  Verifying your email...
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center">
                  This usually takes a few seconds
                </Typography>
              </>
            ) : (
              <>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: 'success.lighter',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <MailIcon sx={{ fontSize: 40, color: 'success.main' }} />
                </Box>
                <Typography variant="h6" align="center">
                  Email Verified!
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center">
                  We've sent a verification link to <strong>{email}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary" align="center">
                  Redirecting...
                </Typography>
              </>
            )}

            {!isVerifying && resendCooldown === 0 && (
              <Button
                variant="text"
                onClick={handleResend}
                size="small"
              >
                Didn't receive email? Resend
              </Button>
            )}

            {resendCooldown > 0 && (
              <Typography variant="caption" color="text.secondary">
                Resend available in {resendCooldown}s
              </Typography>
            )}
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  )
}
