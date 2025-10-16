import { useEffect, useState } from 'react'
import { List, ListItem, ListItemText, Box, LinearProgress, Typography } from '@mui/material'
import { jobs } from '../services/api'

export default function ProgressLog({ jobId }: { jobId: string }) {
  const [progress, setProgress] = useState<number>(0)
  const [status, setStatus] = useState<string>('QUEUED')

  useEffect(() => {
    let alive = true
    const tick = async () => {
      try {
        const j = await jobs.get(jobId)
        if (!alive) return
        setStatus(j.status)
        setProgress(j.progress ?? (j.status === 'COMPLETED' ? 100 : j.status === 'FAILED' ? 100 : 10))
      } catch {
        /* ignore */
      }
    }
    tick()
    const t = setInterval(tick, 1500)
    return () => { alive = false; clearInterval(t) }
  }, [jobId])

  const friendly = {
    QUEUED: 'Queued',
    PROCESSING: 'Processing',
    COMPLETED: 'Completed',
    FAILED: 'Failed',
  } as Record<string,string>

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>Status</Typography>
      <LinearProgress variant="determinate" value={progress} sx={{ my: 2 }} />
      <List dense>
        <ListItem>
          <ListItemText primary={friendly[status] || status} secondary={`Job ${jobId.slice(0,8)}`} />
        </ListItem>
      </List>
    </Box>
  )
}
