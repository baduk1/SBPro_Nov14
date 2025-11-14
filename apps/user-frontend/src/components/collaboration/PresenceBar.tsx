/**
 * PresenceBar Component
 *
 * Displays avatars of users currently online in the project.
 * Shows up to 5 avatars with overflow indicator.
 * Updates in real-time via WebSocket.
 */

import React from 'react'
import { Box, Avatar, Tooltip, Typography, Stack, useTheme, useMediaQuery } from '@mui/material'
import { FiberManualRecord as OnlineIcon } from '@mui/icons-material'
import { usePresence } from '../../hooks/usePresence'

interface Props {
  projectId: string
}

export default function PresenceBar({ projectId }: Props) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { onlineUsers, totalOnline, isConnected } = usePresence(projectId)

  // Don't show if not connected or no users online
  if (!isConnected || totalOnline === 0) {
    return null
  }

  const displayUsers = onlineUsers.slice(0, 5)
  const overflow = totalOnline - displayUsers.length

  return (
    <Stack
      direction="row"
      spacing={-1}
      alignItems="center"
      sx={{ ml: 2 }}
    >
      {displayUsers.map(user => (
        <Tooltip
          key={user.id}
          title={`${user.full_name} (${user.role})`}
          placement="bottom"
        >
          <Avatar
            sx={{
              width: isMobile ? 44 : 32,
              height: isMobile ? 44 : 32,
              border: '2px solid white',
              cursor: 'pointer',
              bgcolor: 'primary.main',
              fontSize: isMobile ? '1rem' : '0.875rem',
              fontWeight: 600
            }}
            src={user.avatar_url}
            alt={user.full_name}
          >
            {user.full_name.charAt(0).toUpperCase()}
          </Avatar>
        </Tooltip>
      ))}

      {overflow > 0 && (
        <Tooltip title={`+${overflow} more online`} placement="bottom">
          <Avatar
            sx={{
              width: isMobile ? 44 : 32,
              height: isMobile ? 44 : 32,
              border: '2px solid white',
              bgcolor: 'grey.400',
              fontSize: isMobile ? '0.875rem' : '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            +{overflow}
          </Avatar>
        </Tooltip>
      )}

      <Box sx={{ ml: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <OnlineIcon
          sx={{
            fontSize: 12,
            color: 'success.main',
            animation: 'pulse 2s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.5 }
            }
          }}
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            fontWeight: 500,
            display: { xs: 'none', sm: 'block' }
          }}
        >
          {totalOnline} online
        </Typography>
      </Box>
    </Stack>
  )
}
