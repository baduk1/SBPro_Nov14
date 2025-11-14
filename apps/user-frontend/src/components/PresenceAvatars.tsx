/**
 * PresenceAvatars Component
 *
 * Displays avatars of users currently online in the project.
 * Shows online count as a chip.
 * Updated to use new usePresence hook with full collaborator mapping.
 */

import { Avatar, AvatarGroup, Box, Chip, Tooltip, useTheme, useMediaQuery } from '@mui/material'
import { Circle as OnlineIcon } from '@mui/icons-material'
import { usePresence } from '../hooks/usePresence'

interface PresenceAvatarsProps {
  projectId: string
}

export default function PresenceAvatars({ projectId }: PresenceAvatarsProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { onlineUsers, totalOnline, isConnected } = usePresence(projectId)

  if (!isConnected || totalOnline === 0) {
    return null
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <Chip
        icon={<OnlineIcon sx={{ fontSize: 12, color: 'success.main' }} />}
        label={`${totalOnline} online`}
        size="small"
        variant="outlined"
        color="success"
      />
      <AvatarGroup
        max={5}
        sx={{
          '& .MuiAvatar-root': {
            width: isMobile ? 44 : 32,
            height: isMobile ? 44 : 32,
            fontSize: isMobile ? 16 : 14
          }
        }}
      >
        {onlineUsers.map((user) => (
          <Tooltip key={user.id} title={`${user.full_name} (${user.role})`}>
            <Avatar
              alt={user.full_name}
              src={user.avatar_url}
              sx={{ bgcolor: 'primary.main' }}
            >
              {user.full_name.charAt(0).toUpperCase()}
            </Avatar>
          </Tooltip>
        ))}
      </AvatarGroup>
    </Box>
  )
}
