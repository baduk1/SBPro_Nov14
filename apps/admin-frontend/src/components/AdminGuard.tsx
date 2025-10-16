import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { useAdminAuth } from '../hooks/useAdminAuth'

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { loadProfile } = useAdminAuth()
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    loadProfile().then(setAllowed)
  }, [loadProfile])

  if (allowed === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!allowed) {
    return <Navigate to="/signin" replace />
  }

  return <>{children}</>
}
