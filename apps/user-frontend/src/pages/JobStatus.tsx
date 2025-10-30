import { useParams, Link } from 'react-router-dom'
import { Box, Typography, Button, Stack } from '@mui/material'
import ProgressLog from '../components/ProgressLog'
import { jobs } from '../services/api'
import { useEffect, useState } from 'react'

export default function JobStatus() {
  const { id } = useParams()
  const [ready, setReady] = useState(false)

  useEffect(()=>{
    let alive = true
    const probe = async ()=>{
      try {
        if (!id) return
        const j = await jobs.get(id)
        if (alive) setReady((j.status || '').toUpperCase() === 'COMPLETED')
      } catch {/* ignore */}
    }
    probe()
    const t = setInterval(probe, 2000)
    return ()=>{ alive=false; clearInterval(t) }
  }, [id])

  if (!id) return null
  return (
    <Box>
      <Typography variant="h5" sx={{mb:2}}>Job Status</Typography>
      <ProgressLog jobId={id} />
      <Stack direction="row" spacing={1} sx={{mt:2}}>
        <Button component={Link} to={`/app/jobs/${id}/takeoff`} variant="contained" disabled={!ready}>
          Open Take‑off
        </Button>
        <Button component={Link} to={`/app/jobs/${id}/boq`} variant="outlined" disabled={!ready}>
          Edit BoQ
        </Button>
      </Stack>
    </Box>
  )
}
