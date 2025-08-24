import { useParams, Link } from 'react-router-dom'
import { Box, Typography, Button } from '@mui/material'
import ProgressLog from '../components/ProgressLog'

export default function JobStatus() {
  const { id } = useParams()
  if (!id) return null
  return (
    <Box>
      <Typography variant="h5" sx={{mb:2}}>Job Status</Typography>
      <ProgressLog jobId={id} />
      <Box sx={{mt:2, display:'flex', gap:1}}>
        <Button component={Link} to={`/app/jobs/${id}/takeoff`} variant="outlined">Take‑off Preview</Button>
        <Button component={Link} to={`/app/jobs/${id}/mapping`} variant="outlined">Mapping / Allowances</Button>
        <Button component={Link} to={`/app/jobs/${id}/boq`} variant="outlined">BoQ Preview</Button>
      </Box>
    </Box>
  )
}
