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
import { Delete, Email, Schedule, Send } from '@mui/icons-material';
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
      return api.collaboration.listInvitations(projectId, 'pending');
    },
    enabled: !!projectId,
  });

  // Subscribe to real-time invitation updates via SSE
  React.useEffect(() => {
    if (!projectId) return;

    // Get auth token for SSE (EventSource can't send Authorization headers)
    const token = localStorage.getItem('token');

    const eventSource = new EventSource(
      `${api.API_URL}/projects/${projectId}/invitations/stream${token ? `?access_token=${token}` : ''}`,
      { withCredentials: true }
    );

    eventSource.onmessage = (event) => {
      // Invalidate and refetch invitations when any event arrives
      queryClient.invalidateQueries({ queryKey: ['invitations', projectId] });
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [projectId, queryClient]);

  // Revoke invitation mutation
  const revokeMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      return api.collaboration.revokeInvitation(invitationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', projectId] });
    },
    onError: (err: any) => {
      onError?.(err.message || 'Failed to revoke invitation');
    },
  });

  // Resend invitation mutation
  const resendMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      return api.collaboration.resendInvitation(invitationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', projectId] });
    },
    onError: (err: any) => {
      onError?.(err.message || 'Failed to resend invitation');
    },
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  // Silently hide component if there's an error (e.g., user doesn't have permission to view invitations)
  // or if there are no invitations
  if (error || !invitations || invitations.length === 0) {
    return null;
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
                  <Box display="flex" gap={0.5}>
                    <Tooltip title="Resend invitation">
                      <IconButton
                        onClick={() => {
                          resendMutation.mutate(invitation.id);
                        }}
                        disabled={resendMutation.isPending}
                        sx={{ minWidth: 44, minHeight: 44 }}
                        aria-label="Resend invitation"
                      >
                        <Send fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Revoke invitation">
                      <IconButton
                        edge="end"
                        onClick={() => {
                          if (window.confirm('Revoke this invitation?')) {
                            revokeMutation.mutate(invitation.id);
                          }
                        }}
                        disabled={revokeMutation.isPending}
                        sx={{ minWidth: 44, minHeight: 44 }}
                        aria-label="Revoke invitation"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
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
