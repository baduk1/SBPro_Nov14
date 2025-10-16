import { useEffect, useState } from 'react'
import { Box, Paper, Stack, Typography } from '@mui/material'
import api from '../services/api'

type Counts = {
  accessRequests?: number
  priceLists?: number
}

export default function AdminDashboard() {
  const [counts, setCounts] = useState<Counts>({})

  useEffect(() => {
    async function load() {
      const [access, price] = await Promise.all([
        api.get('/admin/access-requests'),
        api.get('/admin/price-lists'),
      ])
      setCounts({ accessRequests: access.data.length, priceLists: price.data.length })
    }
    load().catch(() => setCounts({}))
  }, [])

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Admin Dashboard</Typography>
      <Stack direction="row" spacing={2} flexWrap="wrap">
        <Paper sx={{ p: 2, minWidth: 200 }}>
          <Typography variant="subtitle2">Access requests</Typography>
          <Typography variant="h6">{counts.accessRequests ?? '—'}</Typography>
        </Paper>
        <Paper sx={{ p: 2, minWidth: 200 }}>
          <Typography variant="subtitle2">Price lists</Typography>
          <Typography variant="h6">{counts.priceLists ?? '—'}</Typography>
        </Paper>
      </Stack>
    </Box>
  )
}
