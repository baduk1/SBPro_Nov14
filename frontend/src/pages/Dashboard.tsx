import { useEffect, useState } from 'react'
import { Box, Typography, Paper, Stack, Button } from '@mui/material'
import api from '../services/api'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const [jobs, setJobs] = useState<any[]>([])
  useEffect(() => { api.get('/jobs').then(res => setJobs(res.data)) }, [])
  return (
    <Box>
      <Typography variant="h5" sx={{mb:2}}>Projects & Jobs</Typography>
      <Stack spacing={2}>
        {jobs.map(j => (
          <Paper key={j.id} sx={{p:2, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div>
              <Typography variant="subtitle1">Job {j.id.slice(0,8)} — {j.status}</Typography>
              <Typography variant="body2">File: {j.file_id} • Progress: {j.progress}%</Typography>
            </div>
            <Stack direction="row" spacing={1}>
              <Button component={Link} to={`/app/jobs/${j.id}`}>Status</Button>
              <Button component={Link} to={`/app/jobs/${j.id}/takeoff`}>Take‑off</Button>
              <Button component={Link} to={`/app/jobs/${j.id}/boq`}>BoQ</Button>
              <Button component={Link} to={`/app/jobs/${j.id}/export`}>Export</Button>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Box>
  )
}
