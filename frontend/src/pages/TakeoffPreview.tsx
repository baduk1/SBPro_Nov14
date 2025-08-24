import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Box, Typography, Button } from '@mui/material'
import DataTable from '../components/DataTable'
import api from '../services/api'

export default function TakeoffPreview() {
  const { id } = useParams()
  const [rows, setRows] = useState<any[]>([])
  useEffect(()=>{ api.get(`/jobs/${id}/takeoff`).then(res => setRows(res.data)) }, [id])

  const columns = [
    { field: 'code', headerName: 'Code', width: 140 },
    { field: 'description', headerName: 'Description', flex: 1 },
    { field: 'unit', headerName: 'Unit', width: 100 },
    { field: 'qty', headerName: 'Qty', width: 120 },
    { field: 'source_ref', headerName: 'Source', width: 160 },
  ]

  return (
    <Box>
      <Typography variant="h5" sx={{mb:2}}>Take‑off Preview</Typography>
      <DataTable rows={rows} columns={columns as any} />
      <Box sx={{mt:2}}>
        <Button component={Link} to={`/app/jobs/${id}/mapping`} variant="contained">Proceed to Mapping</Button>
      </Box>
    </Box>
  )
}
