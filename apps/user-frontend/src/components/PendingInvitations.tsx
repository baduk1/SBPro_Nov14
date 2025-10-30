/**
 * Pending Invitations Component
 *
 * Displays list of pending email invitations for a project.
 * Allows owners/editors to revoke pending invitations.
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Delete, Email, Schedule } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProjectInvitation } from '../services/api';
import api from '../services/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface PendingInvitationsProps {
  projectId: string;
  onError?: (error: string) => void;
}

const statusColors = {
  pending: 'warning',
  accepted: 'success',
  expired: 'default',
  revoked: 'error',
} as const;

export default function PendingInvitations({ projectId, onError }: PendingInvitationsProps) {
  const queryClient = useQueryClient();

  // Fetch pending invitations
  const {
    data: invitations,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['invitations', projectId],
    queryFn: async () => {
      // Note: Backend endpoint not yet created, will add in next iteration
      // For now, return empty array
      return [] as ProjectInvitation[];
    },
    enabled: !!projectId,
  });

  // Revoke invitation mutation (placeholder - backend endpoint needed)
  const revokeMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      // Placeholder - backend endpoint not yet created
      await new Promise((resolve) => setTimeout(resolve, 500));
      throw new Error('Revoke endpoint not yet implemented');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', projectId] });
    },
    onError: (err: any) => {
      onError?.(err.message || 'Failed to revoke invitation');
    },
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load pending invitations
      </Alert>
    );
  }

  if (!invitations || invitations.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No pending invitations
        </Typography>
      </Box>
    );
  }

  return (
    <Paper variant="outlined" sx={{ mt: 2 }}>
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Schedule fontSize="small" color="action" />
        <Typography variant="subtitle2">Pending Invitations ({invitations.length})</Typography>
      </Box>

      <List sx={{ p: 0 }}>
        {invitations.map((invitation) => {
          const isExpired =
            invitation.expires_at && new Date(invitation.expires_at) < new Date();
          const status = isExpired ? 'expired' : invitation.status;

          return (
            <ListItem
              key={invitation.id}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '&:last-child': { borderBottom: 0 },
              }}
              secondaryAction={
                status === 'pending' && (
                  <Tooltip title="Revoke invitation">
                    <IconButton
                      edge="end"
                      onClick={() => {
                        if (window.confirm('Revoke this invitation?')) {
                          revokeMutation.mutate(invitation.id);
                        }
                      }}
                      disabled={revokeMutation.isPending}
                      size="small"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )
              }
            >
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Email fontSize="small" color="action" />
                    <Typography variant="body2">{invitation.email}</Typography>
                  </Box>
                }
                secondary={
                  <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                    <Chip
                      label={invitation.role}
                      size="small"
                      color="primary"
                      sx={{ height: 20, textTransform: 'capitalize' }}
                    />
                    <Chip
                      label={status}
                      size="small"
                      color={statusColors[status]}
                      sx={{ height: 20, textTransform: 'capitalize' }}
                    />
                    {invitation.expires_at && (
                      <Typography variant="caption" color="text.secondary">
                        {isExpired
                          ? 'Expired'
                          : `Expires ${dayjs(invitation.expires_at).fromNow()}`}
                      </Typography>
                    )}
                  </Box>
                }
              />
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
}
