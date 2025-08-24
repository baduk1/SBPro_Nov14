import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Box, Typography, Button, ToggleButtonGroup, ToggleButton } from '@mui/material'
import DataTable from '../components/DataTable'
import api from '../services/api'

export default function BoQPreview() {
  const { id } = useParams()
  const [rows, setRows] = useState<any[]>([])
  const [mode, setMode] = useState<'unpriced'|'priced'>('unpriced')

  const fetchRows = async () => {
    const res = await api.get(`/jobs/${id}/boq`)
    setRows(res.data)
  }

  useEffect(()=>{ fetchRows() }, [id])

  const applyPrices = async () => {
    await api.post(`/jobs/${id}/apply-prices`)
    await fetchRows()
  }

  const columns_unpriced = [
    { field: 'code', headerName: 'Code', width: 140 },
    { field: 'description', headerName: 'Description', flex: 1 },
    { field: 'unit', headerName: 'Unit', width: 100 },
    { field: 'qty', headerName: 'Qty', width: 120 },
  ]

  const columns_priced = [
    ...columns_unpriced,
    { field: 'allowance_amount', headerName: 'Allowance', width: 140 },
    { field: 'mapped_price_item_id', headerName: 'Price Item', width: 220 },
  ]

  return (
    <Box>
      <Typography variant="h5" sx={{mb:2}}>BoQ Preview</Typography>
      <ToggleButtonGroup value={mode} exclusive onChange={(e,v)=>v && setMode(v)} sx={{mb:2}}>
        <ToggleButton value="unpriced">Unpriced</ToggleButton>
        <ToggleButton value="priced">Priced</ToggleButton>
      </ToggleButtonGroup>
      <DataTable rows={rows} columns={(mode==='unpriced'?columns_unpriced:columns_priced) as any} />
      <Box sx={{mt:2, display:'flex', gap:1}}>
        <Button onClick={applyPrices} variant="outlined">Apply Prices</Button>
        <Button component={Link} to={`/app/jobs/${id}/export`} variant="contained">Export</Button>
      </Box>
    </Box>
  )
}
