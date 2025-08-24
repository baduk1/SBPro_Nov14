import { useEffect, useState } from 'react'
import { Box, Typography } from '@mui/material'
import api from '../services/api'
import DataTable from '../components/DataTable'

export default function AdminAccessRequests() {
  const [rows, setRows] = useState<any[]>([])
  useEffect(()=>{ api.get('/public/access-requests').then(res=>setRows(res.data)) }, [])

  const columns = [
    { field: 'created_at', headerName: 'Created', width: 180 },
    { field: 'name', headerName: 'Name', width: 160 },
    { field: 'email', headerName: 'Email', width: 220 },
    { field: 'company', headerName: 'Company', width: 180 },
    { field: 'message', headerName: 'Message', flex: 1 },
    { field: 'status', headerName: 'Status', width: 120 },
  ]

  return (
    <Box>
      <Typography variant="h5" sx={{mb:2}}>Admin • Access Requests</Typography>
      <DataTable rows={rows} columns={columns as any} />
    </Box>
  )
}
