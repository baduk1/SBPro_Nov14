import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Box, Typography, Button, TextField } from '@mui/material'
import api from '../services/api'

type Row = { id:string; code?:string; description:string; unit:string; qty:number; mapped_price_item_id?:string; allowance_amount?:number }

export default function MappingAllowances() {
  const { id } = useParams()
  const [rows, setRows] = useState<Row[]>([])

  useEffect(()=>{ api.get(`/jobs/${id}/takeoff`).then(res => setRows(res.data)) }, [id])

  const updateRow = (rid:string, patch:Partial<Row>) => setRows(prev => prev.map(r => r.id===rid ? {...r, ...patch}: r))

  const save = async () => {
    const items = rows.map(r => ({ id: r.id, code: r.code || null, mapped_price_item_id: r.mapped_price_item_id || null, allowance_amount: r.allowance_amount || 0 }))
    await api.patch(`/jobs/${id}/mapping`, { items })
    alert('Saved mappings.')
  }

  return (
    <Box>
      <Typography variant="h5" sx={{mb:2}}>Mapping / Allowances</Typography>
      {rows.map(r => (
        <Box key={r.id} sx={{display:'grid', gridTemplateColumns:'140px 1fr 80px 120px 220px', gap:1, alignItems:'center', py:0.5}}>
          <TextField size="small" label="Code" value={r.code || ''} onChange={(e)=>updateRow(r.id,{code:e.target.value})} />
          <div>{r.description}</div>
          <div>{r.unit}</div>
          <div>{r.qty}</div>
          <TextField size="small" type="number" label="Allowance" value={r.allowance_amount || 0} onChange={(e)=>updateRow(r.id,{allowance_amount: parseFloat(e.target.value)})} />
        </Box>
      ))}
      <Box sx={{mt:2, display:'flex', gap:1}}>
        <Button variant="contained" onClick={save}>Save</Button>
      </Box>
    </Box>
  )
}
