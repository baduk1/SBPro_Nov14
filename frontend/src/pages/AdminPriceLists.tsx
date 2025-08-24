import { useEffect, useState } from 'react'
import { Box, Typography, Button, TextField, Paper } from '@mui/material'
import api from '../services/api'

function PriceListUpload({ priceListId, onDone }:{priceListId:string, onDone:()=>void}) {
  const [file, setFile] = useState<File|null>(null)
  const upload = async ()=>{
    if(!file) return
    const form = new FormData()
    form.append('file', file)
    await api.post(`/admin/price-lists/${priceListId}/items:bulk`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
    onDone()
  }
  return (
    <Box sx={{display:'flex', gap:2, alignItems:'center'}}>
      <Button variant="outlined" component="label">
        Choose CSV
        <input type="file" hidden accept=".csv" onChange={(e)=>setFile(e.target.files?.[0]||null)} />
      </Button>
      <Button variant="contained" onClick={upload} disabled={!file}>Upload Items</Button>
    </Box>
  )
}

export default function AdminPriceLists() {
  const [lists, setLists] = useState<any[]>([])
  const [version, setVersion] = useState('v1')
  const [currency, setCurrency] = useState('GBP')

  const load = ()=> api.get('/admin/price-lists').then(res=>setLists(res.data))
  useEffect(()=>{ load() }, [])

  const create = async ()=>{
    await api.post('/admin/price-lists', { version, currency, is_active: true })
    await load()
  }

  return (
    <Box>
      <Typography variant="h5" sx={{mb:2}}>Admin • Price Lists</Typography>
      <Box sx={{display:'flex', gap:2, mb:2}}>
        <TextField label="Version" value={version} onChange={(e)=>setVersion(e.target.value)} />
        <TextField label="Currency" value={currency} onChange={(e)=>setCurrency(e.target.value)} />
        <Button variant="contained" onClick={create}>Create</Button>
      </Box>
      {lists.map(pl => (
        <Paper key={pl.id} sx={{p:2, mb:2}}>
          <Typography variant="subtitle1">{pl.version} • {pl.currency} • {pl.is_active ? 'Active' : 'Inactive'}</Typography>
          <PriceListUpload priceListId={pl.id} onDone={load} />
        </Paper>
      ))}
    </Box>
  )
}
