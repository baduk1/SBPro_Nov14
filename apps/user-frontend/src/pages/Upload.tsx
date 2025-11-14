import { Box, Typography } from '@mui/material'
import { useSearchParams } from 'react-router-dom'
import FileUpload from '../components/FileUpload'

export default function Upload() {
  const [searchParams] = useSearchParams()
  const preselectedProject = searchParams.get('project')

  return (
    <Box>
      <Typography variant="h5" sx={{mb:2}}>Upload + Queue</Typography>
      <FileUpload preselectedProjectId={preselectedProject || undefined} />
    </Box>
  )
}
