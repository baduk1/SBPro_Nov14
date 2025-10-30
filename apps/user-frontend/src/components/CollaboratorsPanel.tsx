/**
 * Collaborators Panel Component
 *
 * Displays list of project collaborators with real-time presence indicators.
 * Allows project owners/editors to manage team members.
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  IconButton,
  Button,
  Menu,
  MenuItem,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  PersonAdd,
  MoreVert,
  Circle,
  Email,
  Edit,
  Delete,
  Person,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collaboration, Collaborator } from '../services/api';
import { useUserPresence } from '../contexts/WebSocketContext';
import InviteUserDialog from './InviteUserDialog';

interface CollaboratorsPanelProps {
  projectId: string;
  currentUserId?: string;
  onError?: (error: string) => void;
}

const roleColors = {
  owner: 'error',
  editor: 'primary',
  viewer: 'default',
} as const;

const roleLabels = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
};

export default function CollaboratorsPanel({
  projectId,
  currentUserId,
  onError,
}: CollaboratorsPanelProps) {
  const queryClient = useQueryClient();
  const { onlineUsers } = useUserPresence();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);

  // Fetch collaborators
  const {
    data: collaborators,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['collaborators', projectId],
    queryFn: () => collaboration.listCollaborators(projectId),
    enabled: !!projectId,
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ collaboratorId, role }: { collaboratorId: number; role: string }) =>
      collaboration.updateCollaboratorRole(projectId, collaboratorId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', projectId] });
      handleCloseMenu();
    },
    onError: (err: any) => {
      onError?.(err.response?.data?.detail || 'Failed to update role');
    },
  });

  // Remove collaborator mutation
  const removeCollaboratorMutation = useMutation({
    mutationFn: (collaboratorId: number) =>
      collaboration.removeCollaborator(projectId, collaboratorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', projectId] });
      handleCloseMenu();
    },
    onError: (err: any) => {
      onError?.(err.response?.data?.detail || 'Failed to remove collaborator');
    },
  });

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, collaborator: Collaborator) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedCollaborator(collaborator);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
    setSelectedCollaborator(null);
  };

  const handleChangeRole = (role: string) => {
    if (selectedCollaborator) {
      updateRoleMutation.mutate({
        collaboratorId: selectedCollaborator.id,
        role,
      });
    }
  };

  const handleRemoveCollaborator = () => {
    if (selectedCollaborator && window.confirm('Remove this collaborator from the project?')) {
      removeCollaboratorMutation.mutate(selectedCollaborator.id);
    }
  };

  const currentUserCollaborator = collaborators?.find((c) => c.user_id === currentUserId);
  const isOwnerOrEditor =
    currentUserCollaborator?.role === 'owner' || currentUserCollaborator?.role === 'editor';

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load collaborators
      </Alert>
    );
  }

  const isUserOnline = (userId: string) => onlineUsers.includes(userId);

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Person color="action" />
          <Typography variant="h6">Team ({collaborators?.length || 0})</Typography>
        </Box>
        {isOwnerOrEditor && (
          <Tooltip title="Invite team member">
            <Button
              variant="contained"
              size="small"
              startIcon={<PersonAdd />}
              onClick={() => setInviteDialogOpen(true)}
            >
              Invite
            </Button>
          </Tooltip>
        )}
      </Box>

      {/* Collaborators List */}
      <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
        {collaborators?.map((collaborator) => {
          const isOnline = isUserOnline(collaborator.user_id);
          const isCurrentUser = collaborator.user_id === currentUserId;
          const canManage = isOwnerOrEditor && !isCurrentUser && collaborator.role !== 'owner';

          return (
            <ListItem
              key={collaborator.id}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              secondaryAction={
                canManage && (
                  <IconButton
                    edge="end"
                    onClick={(e) => handleOpenMenu(e, collaborator)}
                    disabled={updateRoleMutation.isPending || removeCollaboratorMutation.isPending}
                  >
                    <MoreVert />
                  </IconButton>
                )
              }
            >
              <ListItemAvatar>
                <Box position="relative">
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {collaborator.user_email?.[0]?.toUpperCase() || '?'}
                  </Avatar>
                  {isOnline && (
                    <Tooltip title="Online">
                      <Circle
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          fontSize: 14,
                          color: 'success.main',
                          bgcolor: 'background.paper',
                          borderRadius: '50%',
                        }}
                      />
                    </Tooltip>
                  )}
                </Box>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body1">
                      {collaborator.user_name || collaborator.user_email}
                    </Typography>
                    {isCurrentUser && (
                      <Chip label="You" size="small" color="default" sx={{ height: 20 }} />
                    )}
                  </Box>
                }
                secondary={
                  <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                    <Chip
                      label={roleLabels[collaborator.role]}
                      size="small"
                      color={roleColors[collaborator.role]}
                      sx={{ height: 20 }}
                    />
                    {collaborator.user_email && !collaborator.user_name && (
                      <Typography variant="caption" color="text.secondary">
                        {collaborator.user_email}
                      </Typography>
                    )}
                  </Box>
                }
              />
            </ListItem>
          );
        })}
      </List>

      {/* Context Menu */}
      <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleCloseMenu}>
        {selectedCollaborator?.role !== 'editor' && (
          <MenuItem onClick={() => handleChangeRole('editor')}>
            <Edit fontSize="small" sx={{ mr: 1 }} />
            Change to Editor
          </MenuItem>
        )}
        {selectedCollaborator?.role !== 'viewer' && (
          <MenuItem onClick={() => handleChangeRole('viewer')}>
            <Email fontSize="small" sx={{ mr: 1 }} />
            Change to Viewer
          </MenuItem>
        )}
        <MenuItem onClick={handleRemoveCollaborator} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Remove from project
        </MenuItem>
      </Menu>

      {/* Invite Dialog */}
      <InviteUserDialog
        open={inviteDialogOpen}
        projectId={projectId}
        onClose={() => setInviteDialogOpen(false)}
        onSuccess={() => {
          setInviteDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: ['collaborators', projectId] });
        }}
        onError={onError}
      />
    </Paper>
  );
}
