import { useState } from 'react'
import {
  Box,
  Button,
  TextField,
  Typography
} from '@mui/material'
import api from '../services/api'

export default function AccessRequestForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const submit = async () => {
    try {
      await api.post('/public/access-requests', { name, email, company, message })
      setSubmitted(true)
    } catch (error) {
      console.error('Failed to submit access request:', error)
      // Show error to user
      alert('Failed to submit request. Please try again.')
    }
  }

  if (submitted) {
    return (
      <Typography variant="body1" color="success.main" sx={{mt:2}}>
        Thank you! Your access request has been submitted. 
        Our team will review it and send you an email with instructions to set up your account.
      </Typography>
    )
  }

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
    </>
  )
}
