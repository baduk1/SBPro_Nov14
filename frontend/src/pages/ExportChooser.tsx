import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Box, Typography, Button, Stack, Link as MLink } from '@mui/material'
import api, { API_URL } from '../services/api'

export default function ExportChooser() {
  const { id } = useParams()
  const [artifacts, setArtifacts] = useState<any[]>([])

  const runExport = async (format: string) => {
    await api.post(`/jobs/${id}/export`, null, { params: { format } })
    await loadArtifacts()
  }
  const loadArtifacts = async () => {
    const res = await api.get(`/jobs/${id}/artifacts`)
    setArtifacts(res.data)
  }
  useEffect(()=>{ loadArtifacts() }, [id])

  return (
    <Box>
      <Typography variant="h5" sx={{mb:2}}>Export</Typography>
      <Stack direction="row" spacing={2}>
        <Button variant="contained" onClick={()=>runExport('csv')}>CSV</Button>
        <Button variant="outlined" onClick={()=>runExport('xlsx')}>XLSX</Button>
        <Button variant="outlined" onClick={()=>runExport('pdf')}>PDF</Button>
      </Stack>
      <Typography variant="h6" sx={{mt:3}}>Downloads / History</Typography>
      <ul>
        {artifacts.map(a => (
          <li key={a.id}>
            <MLink href={`${API_URL}/artifacts/${a.id}/download`}>{a.kind} — {a.path.split('/').pop()}</MLink>
          </li>
        ))}
      </ul>
    </Box>
  )
}
