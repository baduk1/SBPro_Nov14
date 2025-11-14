/**
 * Export Queue Drawer Component
 *
 * Real-time export status drawer using Server-Sent Events (SSE).
 * Displays running and completed exports with download functionality.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  CircularProgress,
  Chip,
  Divider,
  Alert,
} from '@mui/material';
import { Close as CloseIcon, Download as DownloadIcon, CheckCircle } from '@mui/icons-material';
import { artifacts as artifactsApi, API_URL } from '../services/api';

interface ExportEvent {
  type: 'export.started' | 'export.completed';
  format: string;
  job_id: string;
  artifact_id?: string;
  timestamp: string;
}

interface Export {
  id: string;
  format: string;
  status: 'running' | 'completed';
  artifact_id?: string;
  timestamp: string;
}

interface ExportQueueDrawerProps {
  jobId: string;
  open: boolean;
  onClose: () => void;
}

export default function ExportQueueDrawer({ jobId, open, onClose }: ExportQueueDrawerProps) {
  const [exports, setExports] = useState<Export[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !jobId) return;

    // Get auth token for SSE (EventSource can't send Authorization headers)
    const token = localStorage.getItem('token');

    // Create EventSource connection with token as query parameter
    const eventSource = new EventSource(
      `${API_URL}/jobs/${jobId}/exports/stream${token ? `?access_token=${token}` : ''}`,
      { withCredentials: true }
    );

    eventSource.onmessage = (event) => {
      try {
        const data: ExportEvent = JSON.parse(event.data);

        if (data.type === 'export.started') {
          // Add new running export
          setExports((prev) => [
            {
              id: `${data.format}-${data.timestamp}`,
              format: data.format,
              status: 'running',
              timestamp: data.timestamp,
            },
            ...prev,
          ]);
        } else if (data.type === 'export.completed') {
          // Update to completed status
          setExports((prev) =>
            prev.map((exp) =>
              exp.format === data.format && exp.status === 'running'
                ? {
                    ...exp,
                    status: 'completed',
                    artifact_id: data.artifact_id,
                    timestamp: data.timestamp,
                  }
                : exp
            )
          );
        }
      } catch (err) {
        console.error('Failed to parse SSE event:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
      setError('Lost connection to export updates. Close and reopen to reconnect.');
      eventSource.close();
    };

    // Cleanup on unmount or when drawer closes
    return () => {
      eventSource.close();
    };
  }, [jobId, open]);

  const handleDownload = useCallback(async (artifactId: string) => {
    try {
      const { url } = await artifactsApi.presign(artifactId);
      const target = url.startsWith('http')
        ? url
        : new URL(url, API_URL.replace(/\/api\/v1\/?$/, '/')).toString().replace(/\/?$/, '');
      window.open(target, '_blank', 'noopener');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to generate download link.');
    }
  }, []);

  const handleClearCompleted = () => {
    setExports((prev) => prev.filter((exp) => exp.status === 'running'));
  };

  const runningExports = exports.filter((exp) => exp.status === 'running');
  const completedExports = exports.filter((exp) => exp.status === 'completed');

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: '100vw', sm: 400 }, maxWidth: '100vw', p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            Export Queue
          </Typography>
          <IconButton
            onClick={onClose}
            edge="end"
            aria-label="Close export queue"
            sx={{ minWidth: '44px', minHeight: '44px' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Running Exports */}
        {runningExports.length > 0 && (
          <>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Running ({runningExports.length})
            </Typography>
            <List sx={{ mb: 2 }}>
              {runningExports.map((exp) => (
                <ListItem
                  key={exp.id}
                  sx={{
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <CircularProgress size={24} sx={{ mr: 2 }} />
                  <ListItemText
                    primary={`Exporting ${exp.format.toUpperCase()}`}
                    secondary={new Date(exp.timestamp).toLocaleTimeString()}
                  />
                  <ListItemSecondaryAction>
                    <Chip label="Running" color="primary" size="small" />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </>
        )}

        {/* Completed Exports */}
        {completedExports.length > 0 && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Completed ({completedExports.length})
              </Typography>
              <Button size="small" onClick={handleClearCompleted} sx={{ textTransform: 'none' }}>
                Clear All
              </Button>
            </Box>
            <List>
              {completedExports.map((exp) => (
                <ListItem
                  key={exp.id}
                  sx={{
                    bgcolor: 'success.light',
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <CheckCircle color="success" sx={{ mr: 2 }} />
                  <ListItemText
                    primary={`${exp.format.toUpperCase()} Export`}
                    secondary={new Date(exp.timestamp).toLocaleTimeString()}
                  />
                  <ListItemSecondaryAction>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={() => exp.artifact_id && handleDownload(exp.artifact_id)}
                      disabled={!exp.artifact_id}
                      sx={{
                        minWidth: '44px',
                        minHeight: '44px',
                      }}
                      aria-label={`Download ${exp.format} export`}
                    >
                      Download
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </>
        )}

        {/* Empty State */}
        {exports.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="body2" color="text.secondary">
              No exports yet. Click an export button to start.
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Footer Info */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Exports are streamed in real-time. Keep this drawer open to see progress updates.
        </Typography>
      </Box>
    </Drawer>
  );
}
