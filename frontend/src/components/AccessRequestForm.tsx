import { useState } from 'react'
import { Box, Button, TextField, Typography } from '@mui/material'
import api from '../services/api'

export default function AccessRequestForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const submit = async ()=>{
    await api.post('/public/access-requests', { name, email, company, message })
    setSubmitted(true)
  }

  if (submitted) return <Typography>Thanks! We will contact you shortly.</Typography>

  return (
    <Box sx={{display:'grid', gap:2, maxWidth:560}}>
      <TextField label="Name" value={name} onChange={e=>setName(e.target.value)} />
      <TextField label="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <TextField label="Company (optional)" value={company} onChange={e=>setCompany(e.target.value)} />
      <TextField label="Message" multiline rows={3} value={message} onChange={e=>setMessage(e.target.value)} />
      <Button variant="contained" onClick={submit}>Request Access</Button>
    </Box>
  )
}
