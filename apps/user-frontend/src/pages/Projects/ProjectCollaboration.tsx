/**
 * Project Collaboration Page
 *
 * Main page for managing project team members and invitations.
 * Shows real-time user presence and allows inviting new members.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Alert,
  Snackbar,
  Breadcrumbs,
  Link,
  Grid,
} from '@mui/material';
import { ArrowBack, Groups } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { projects } from '../../services/api';
import { auth } from '../../services/api';
import CollaboratorsPanel from '../../components/CollaboratorsPanel';
import PendingInvitations from '../../components/PendingInvitations';
import { useProjectRoom, useWebSocket } from '../../contexts/WebSocketContext';

export default function ProjectCollaboration() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isConnected } = useWebSocket();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => auth.me(),
  });

  // Fetch project details
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projects.get(projectId!),
    enabled: !!projectId,
  });

  // Auto-join project room for real-time updates
  useProjectRoom(projectId || null);

  const handleError = (errorMsg: string) => {
    setError(errorMsg);
  };

  const handleSuccess = (message: string) => {
    setSuccessMessage(message);
  };

  if (!projectId) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">Project ID not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box mb={3}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate('/app/dashboard')}
            sx={{ cursor: 'pointer', textDecoration: 'none' }}
          >
            Dashboard
          </Link>
          {project && (
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate(`/app/projects/${projectId}/history`)}
              sx={{ cursor: 'pointer', textDecoration: 'none' }}
            >
              {project.name}
            </Link>
          )}
          <Typography variant="body2" color="text.primary">
            Team
          </Typography>
        </Breadcrumbs>

        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(`/app/projects/${projectId}/history`)}
            variant="outlined"
          >
            Back
          </Button>
          <Box flex={1}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Groups sx={{ fontSize: 32 }} color="primary" />
              <Box>
                <Typography variant="h4" component="h1">
                  Team Collaboration
                </Typography>
                {project && (
                  <Typography variant="body2" color="text.secondary">
                    {project.name}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Connection Status */}
        {!isConnected && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Real-time updates unavailable - connection lost. Team presence may not be accurate.
          </Alert>
        )}
      </Box>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Collaborators Panel */}
        <Grid item xs={12} md={8}>
          <CollaboratorsPanel
            projectId={projectId}
            currentUserId={currentUser?.id}
            onError={handleError}
          />
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              About Collaboration
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Invite team members to collaborate on this project. They'll receive an email with a link
              to join.
            </Typography>

            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              Roles:
            </Typography>
            <Box component="ul" sx={{ pl: 2, mt: 1 }}>
              <Typography component="li" variant="body2" paragraph>
                <strong>Owner:</strong> Full control, can manage team members
              </Typography>
              <Typography component="li" variant="body2" paragraph>
                <strong>Editor:</strong> Can view and edit all project data
              </Typography>
              <Typography component="li" variant="body2">
                <strong>Viewer:</strong> Can view but cannot edit
              </Typography>
            </Box>
          </Paper>

          {/* Pending Invitations */}
          <PendingInvitations projectId={projectId} onError={handleError} />
        </Grid>
      </Grid>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessMessage(null)} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}
