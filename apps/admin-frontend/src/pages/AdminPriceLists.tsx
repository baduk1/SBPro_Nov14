import { useEffect, useState } from 'react'
import { Box, Button, Paper, TextField, Typography } from '@mui/material'
import api from '../services/api'

type PriceList = {
  id: string
  version: string
  currency: string
  is_active: boolean
}

function PriceListUpload({ priceListId, onUploaded }: { priceListId: string; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null)

  const upload = async () => {
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    await api.post(`/admin/price-lists/${priceListId}/items:bulk`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    onUploaded()
    setFile(null)
  }

  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
      <Button variant="outlined" component="label">
        Choose CSV
        <input type="file" hidden accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </Button>
      <Button variant="contained" disabled={!file} onClick={upload}>
        Upload items
      </Button>
    </Box>
  )
}

export default function AdminPriceLists() {
  const [lists, setLists] = useState<PriceList[]>([])
  const [version, setVersion] = useState('v1')
  const [currency, setCurrency] = useState('GBP')

  const load = async () => {
    const res = await api.get<PriceList[]>('/admin/price-lists')
    setLists(res.data)
  }

  useEffect(() => {
    load()
  }, [])

  const create = async () => {
    await api.post('/admin/price-lists', { version, currency })
    await load()
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Price lists</Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <TextField label="Version" value={version} onChange={(e) => setVersion(e.target.value)} />
        <TextField label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
        <Button variant="contained" onClick={create}>Create</Button>
      </Box>

      {lists.map((pl) => (
        <Paper key={pl.id} sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1">{pl.version} • {pl.currency}</Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>{pl.is_active ? 'Active' : 'Inactive'}</Typography>
          <PriceListUpload priceListId={pl.id} onUploaded={load} />
        </Paper>
      ))}
    </Box>
  )
}
