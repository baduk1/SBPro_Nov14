/**
 * Invite User Dialog Component
 *
 * Dialog for inviting new team members to a project via email.
 * Sends invitation emails and creates pending invitations.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  Typography,
  CircularProgress,
} from '@mui/material';
import { Email, Send } from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { collaboration, InviteUserRequest } from '../services/api';

interface InviteUserDialogProps {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function InviteUserDialog({
  open,
  projectId,
  onClose,
  onSuccess,
  onError,
}: InviteUserDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [emailError, setEmailError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const inviteMutation = useMutation({
    mutationFn: (data: InviteUserRequest) => collaboration.inviteUser(projectId, data),
    onSuccess: () => {
      setSuccessMessage(`Invitation sent to ${email}! They will receive an email with a link to join.`);
      setEmail('');
      setRole('editor');
      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 2000);
    },
    onError: (err: any) => {
      const errorMsg = err.response?.data?.detail || 'Failed to send invitation';
      onError?.(errorMsg);
      setEmailError(errorMsg);
    },
  });

  const handleClose = () => {
    if (!inviteMutation.isPending) {
      setEmail('');
      setRole('editor');
      setEmailError('');
      setSuccessMessage('');
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setSuccessMessage('');

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Send invitation
    inviteMutation.mutate({ email: email.toLowerCase().trim(), role });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Email />
          <span>Invite Team Member</span>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3}>
            {successMessage ? (
              <Alert severity="success">{successMessage}</Alert>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary">
                  Invite a team member to collaborate on this project. They will receive an email with a
                  link to accept the invitation.
                </Typography>

                <TextField
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                  }}
                  error={!!emailError}
                  helperText={emailError}
                  placeholder="colleague@example.com"
                  fullWidth
                  required
                  autoFocus
                  disabled={inviteMutation.isPending}
                />

                <FormControl fullWidth required disabled={inviteMutation.isPending}>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={role}
                    label="Role"
                    onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
                  >
                    <MenuItem value="editor">
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          Editor
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Can view and edit all project data, manage tasks
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="viewer">
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          Viewer
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Can view project data and reports, but cannot edit
                        </Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>

                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    <strong>Note:</strong> The invitation will expire in 7 days. They can accept it by
                    clicking the link in the email.
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={inviteMutation.isPending}>
            Cancel
          </Button>
          {!successMessage && (
            <Button
              type="submit"
              variant="contained"
              startIcon={inviteMutation.isPending ? <CircularProgress size={20} /> : <Send />}
              disabled={inviteMutation.isPending}
            >
              {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
}
