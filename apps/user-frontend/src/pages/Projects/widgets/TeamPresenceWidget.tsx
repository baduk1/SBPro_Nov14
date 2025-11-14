/**
 * TeamPresenceWidget Component
 *
 * Displays team members online and provides link to team page.
 * Uses existing PresenceAvatars component.
 */

import { Card, CardContent, Typography, Box, Button } from '@mui/material'
import { Group as TeamIcon } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import PresenceAvatars from '../../../components/PresenceAvatars'
import { useUserPresence } from '../../../contexts/WebSocketContext'

interface TeamPresenceWidgetProps {
  projectId: string
}

export default function TeamPresenceWidget({ projectId }: TeamPresenceWidgetProps) {
  const navigate = useNavigate()
  const { onlineCount, isConnected } = useUserPresence()

  const handleViewTeam = () => {
    navigate(`/app/projects/${projectId}/team`)
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Team
        </Typography>
        {isConnected && onlineCount > 0 ? (
          <Box sx={{ mb: 2 }}>
            <PresenceAvatars projectId={projectId} />
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No team members online
          </Typography>
        )}
        <Button
          variant="outlined"
          startIcon={<TeamIcon />}
          onClick={handleViewTeam}
          fullWidth
          size="small"
        >
          View All Team Members
        </Button>
      </CardContent>
    </Card>
  )
}
