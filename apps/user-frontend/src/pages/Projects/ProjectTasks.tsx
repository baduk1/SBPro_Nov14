/**
 * Project Tasks Page
 *
 * Main page for viewing and managing project tasks.
 * Features task list with filters and task editor dialog.
 */

import React, { useState } from 'react';
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
  Stack,
  Chip,
} from '@mui/material';
import { ArrowBack, Assignment, Groups, CheckCircle, History } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { projects } from '../../services/api';
import { useProjectRoom, useWebSocket } from '../../contexts/WebSocketContext';
import TaskList from '../../components/TaskList';
import TaskEditor from '../../components/TaskEditor';

export default function ProjectTasks() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isConnected } = useWebSocket();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(undefined);

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

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setEditorOpen(true);
  };

  const handleCreateTask = () => {
    setSelectedTaskId(undefined);
    setEditorOpen(true);
  };

  const handleEditorClose = () => {
    setEditorOpen(false);
    setSelectedTaskId(undefined);
  };

  const handleEditorSuccess = () => {
    handleSuccess(selectedTaskId ? 'Task updated successfully' : 'Task created successfully');
  };

  if (!projectId) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
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
            Tasks
          </Typography>
        </Breadcrumbs>

        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(`/app/projects/${projectId}/history`)}
            variant="outlined"
          >
            Back
          </Button>
          <Box flex={1}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Assignment sx={{ fontSize: 32 }} color="primary" />
              <Box>
                <Typography variant="h4" component="h1">
                  Project Tasks
                </Typography>
                {project && (
                  <Typography variant="body2" color="text.secondary">
                    {project.name}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
          <Button
            variant="outlined"
            startIcon={<History />}
            onClick={() => navigate(`/app/projects/${projectId}/history`)}
          >
            History
          </Button>
          <Button
            variant="outlined"
            startIcon={<Groups />}
            onClick={() => navigate(`/app/projects/${projectId}/team`)}
          >
            Team
          </Button>
        </Stack>

        {/* Status Bar */}
        <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            icon={isConnected ? <CheckCircle /> : undefined}
            label={isConnected ? 'Real-time sync active' : 'Offline mode'}
            color={isConnected ? 'success' : 'default'}
            size="small"
          />
          {!isConnected && (
            <Typography variant="caption" color="text.secondary">
              Tasks will sync when connection is restored
            </Typography>
          )}
        </Paper>

        {/* Connection Warning */}
        {!isConnected && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Real-time updates unavailable - connection lost. You can still view and edit tasks.
          </Alert>
        )}
      </Box>

      {/* Task List */}
      <TaskList
        projectId={projectId}
        onTaskClick={handleTaskClick}
        onCreateTask={handleCreateTask}
      />

      {/* Task Editor Dialog */}
      <TaskEditor
        open={editorOpen}
        projectId={projectId}
        taskId={selectedTaskId}
        onClose={handleEditorClose}
        onSuccess={handleEditorSuccess}
        onError={handleError}
      />

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
