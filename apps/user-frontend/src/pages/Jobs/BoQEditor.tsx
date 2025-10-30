/**
 * BoQ Editor Page
 *
 * Full-page Bill of Quantities editor with real-time collaboration.
 * Features bulk operations, validation, and export options.
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Alert,
  Snackbar,
  Breadcrumbs,
  Link,
  Stack,
  Chip,
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Download,
  People,
  CheckCircle,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { jobs } from '../../services/api';
import { useProjectRoom, useWebSocket, useUserPresence } from '../../contexts/WebSocketContext';
import BoQEditableGrid from '../../components/BoQEditableGrid';

export default function BoQEditor() {
  const { id: jobId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isConnected } = useWebSocket();
  const { onlineCount } = useUserPresence();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch job details
  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobs.get(jobId!),
    enabled: !!jobId,
  });

  // Auto-join project room for real-time updates
  useProjectRoom(job?.project_id || null);

  const handleError = (errorMsg: string) => {
    setError(errorMsg);
  };

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    try {
      await jobs.export(jobId!, format);
      setSuccessMessage(`Exported as ${format.toUpperCase()}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to export as ${format}`);
    }
  };

  if (!jobId) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">Job ID not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
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
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate(`/app/jobs/${jobId}`)}
            sx={{ cursor: 'pointer', textDecoration: 'none' }}
          >
            Job Details
          </Link>
          <Typography variant="body2" color="text.primary">
            BoQ Editor
          </Typography>
        </Breadcrumbs>

        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(`/app/jobs/${jobId}`)}
            variant="outlined"
          >
            Back
          </Button>
          <Box flex={1}>
            <Typography variant="h4" component="h1">
              Bill of Quantities Editor
            </Typography>
            {job && (
              <Typography variant="body2" color="text.secondary">
                {job.type || 'Job'} · Status: {job.status}
              </Typography>
            )}
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => handleExport('xlsx')}
            >
              Export Excel
            </Button>
            <Button variant="outlined" startIcon={<Download />} onClick={() => handleExport('pdf')}>
              Export PDF
            </Button>
          </Stack>
        </Stack>

        {/* Status Bar */}
        <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            icon={isConnected ? <CheckCircle /> : undefined}
            label={isConnected ? 'Real-time sync active' : 'Offline mode'}
            color={isConnected ? 'success' : 'default'}
            size="small"
          />
          {isConnected && onlineCount > 0 && (
            <Chip
              icon={<People />}
              label={`${onlineCount} ${onlineCount === 1 ? 'person' : 'people'} online`}
              size="small"
              variant="outlined"
            />
          )}
          <Box flex={1} />
          <Typography variant="caption" color="text.secondary">
            Changes are saved automatically
          </Typography>
        </Paper>

        {/* Connection Warning */}
        {!isConnected && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Real-time collaboration unavailable. You're working in offline mode. Changes will sync
            when connection is restored.
          </Alert>
        )}
      </Box>

      {/* BoQ Grid */}
      <BoQEditableGrid
        jobId={jobId}
        projectId={job?.project_id}
        editable={true}
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
