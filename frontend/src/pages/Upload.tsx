import { Box, Typography } from '@mui/material'
import FileUpload from '../components/FileUpload'

export default function Upload() {
  return (
    <Box>
      <Typography variant="h5" sx={{mb:2}}>Upload + Pre‑check</Typography>
      <FileUpload />
    </Box>
  )
}
