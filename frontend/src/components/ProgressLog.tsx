import { useEffect, useState } from 'react'
import { List, ListItem, ListItemText, Box, LinearProgress, Typography } from '@mui/material'
import api, { API_URL } from '../services/api'
import { connectSSE } from '../services/sse'

export default function ProgressLog({ jobId }: { jobId: string }) {
  const [events, setEvents] = useState<{stage:string; message:string; ts?:string}[]>([])
  const [progress, setProgress] = useState<number>(10)

  useEffect(()=>{
    api.get(`/jobs/${jobId}/events`).then(res=>setEvents(res.data))
    const disconnect = connectSSE(`${API_URL}/jobs/${jobId}/stream`, (data)=>setEvents(prev=>[...prev, data]))
    const timer = setInterval(async () => {
      const j = await api.get(`/jobs/${jobId}`)
      setProgress(j.data.progress || 0)
    }, 1000)
    return ()=>{ disconnect(); clearInterval(timer) }
  }, [jobId])

  return (
    <Box>
      <Typography variant="h6" sx={{mb:1}}>Status</Typography>
      <LinearProgress variant="determinate" value={progress} sx={{my:2}} />
      <List dense>
        {events.map((e, i)=>(
          <ListItem key={i}>
            <ListItemText primary={e.message} secondary={e.stage} />
          </ListItem>
        ))}
      </List>
    </Box>
  )
}
