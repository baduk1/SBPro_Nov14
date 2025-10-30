import { useEffect, useState } from 'react'
import { Box, Button, MenuItem, Select, Typography, IconButton, Stack, Chip, Snackbar, Alert } from '@mui/material'
import { Check as CheckIcon, Close as CloseIcon, Refresh as RefreshIcon } from '@mui/icons-material'
import DataTable from '../components/DataTable'
import api from '../services/api'

type AccessRequest = {
  id: string
  name: string
  email: string
  company?: string | null
  message?: string | null
  status: string
  created_at: string
}

export default function AdminAccessRequests() {
  const [rows, setRows] = useState<AccessRequest[]>([])
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })

  const load = async () => {
    try {
      // ✅ Load from backend (no mock fallback)
      const res = await api.get<AccessRequest[]>('/admin/access-requests')
      setRows(res.data)
    } catch (error: any) {
      console.error('Failed to load access requests:', error)
      setSnackbar({
        open: true,
        message: error?.response?.data?.detail || 'Failed to load access requests',
        severity: 'error'
      })
      setRows([])
    }
  }

  useEffect(() => {
    load()
  }, [])

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/admin/access-requests/${id}`, { status })
      await load()
      setSnackbar({ open: true, message: `Request ${status}`, severity: 'success' })
    } catch (error: any) {
      console.error('Failed to update status:', error)
      setSnackbar({
        open: true,
        message: error?.response?.data?.detail || 'Failed to update request status',
        severity: 'error'
      })
    }
  }

  const handleApprove = async (id: string) => {
    try {
      // ✅ Call the /approve endpoint which creates user and sends invite email
      const response = await api.post(`/admin/access-requests/${id}/approve`)
      await load()
      
      setSnackbar({
        open: true,
        message: response.data.message || 'Request approved and invite sent',
        severity: 'success'
      })
    } catch (error: any) {
      console.error('Failed to approve request:', error)
      
      let errorMessage = 'Failed to approve request'
      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail
      } else if (error?.response?.status === 409) {
        errorMessage = 'User already exists or request already approved'
      }
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      })
    }
  }

  const handleReject = (id: string) => {
    updateStatus(id, 'rejected')
  }

  const columns = [
    {
      field: 'created_at',
      headerName: 'Created',
      width: 180,
      renderCell: (params: any) => new Date(params.value).toLocaleDateString()
    },
    { field: 'name', headerName: 'Name', width: 160 },
    { field: 'email', headerName: 'Email', width: 220 },
    { field: 'company', headerName: 'Company', width: 180 },
    { field: 'message', headerName: 'Message', flex: 1 },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params: any) => (
        <Chip
          label={params.value}
          size="small"
          color={
            params.value === 'approved' ? 'success' :
            params.value === 'rejected' ? 'error' :
            params.value === 'reviewed' ? 'info' : 'default'
          }
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params: any) => (
        <Stack direction="row" spacing={0.5}>
          <IconButton
            size="small"
            onClick={() => handleApprove(params.row.id)}
            disabled={params.row.status === 'approved' || params.row.status === 'rejected'}
            aria-label="Approve request"
            color="success"
          >
            <CheckIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleReject(params.row.id)}
            disabled={params.row.status === 'approved' || params.row.status === 'rejected'}
            aria-label="Reject request"
            color="error"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ]

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Access Requests</Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={load}
          aria-label="Refresh requests"
        >
          Refresh
        </Button>
      </Stack>

      {rows.length === 0 ? (
        <Box textAlign="center" py={6}>
          <Typography variant="body1" color="text.secondary">
            No access requests found
          </Typography>
        </Box>
      ) : (
        <DataTable rows={rows} columns={columns as any} />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
