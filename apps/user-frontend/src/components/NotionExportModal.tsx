/**
 * Notion Export Modal Component
 *
 * Allows users to export BoQ data to Notion workspace
 * Handles OAuth connection and export process
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Alert,
  Typography,
  CircularProgress,
  Link,
  Stack,
  Divider,
} from '@mui/material';
import { SiNotion } from 'react-icons/si';
import { CheckCircle, OpenInNew, LinkOff } from '@mui/icons-material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { integrationsAPI } from '../services/integrations';

interface NotionExportModalProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
  projectName: string;
}

export default function NotionExportModal({
  open,
  onClose,
  jobId,
  projectName,
}: NotionExportModalProps) {
  const [exportSuccess, setExportSuccess] = useState(false);
  const [notionPageUrl, setNotionPageUrl] = useState<string | null>(null);

  // Check Notion connection status
  const { data: notionStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['notion-status'],
    queryFn: integrationsAPI.getNotionStatus,
    enabled: open, // Only fetch when modal is open
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: () =>
      integrationsAPI.exportToNotion({
        job_id: jobId,
        include_charts: true,
        include_download_links: true,
      }),
    onSuccess: (data) => {
      setNotionPageUrl(data.notion_page_url);
      setExportSuccess(true);
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: integrationsAPI.disconnectNotion,
    onSuccess: () => {
      refetchStatus();
    },
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setExportSuccess(false);
      setNotionPageUrl(null);
    }
  }, [open]);

  const handleConnectNotion = () => {
    try {
      integrationsAPI.startNotionOAuth();
    } catch (error: any) {
      console.error('Failed to start Notion OAuth:', error);
      alert(error.message || 'Failed to connect to Notion');
    }
  };

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect Notion?')) {
      disconnectMutation.mutate();
    }
  };

  const handleExport = () => {
    exportMutation.mutate();
  };

  const handleClose = () => {
    if (!exportMutation.isPending) {
      onClose();
    }
  };

  const isConnected = notionStatus?.connected || false;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <SiNotion size={24} />
          <Typography variant="h6">Export to Notion</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          {/* Connection Status */}
          {isConnected ? (
            <Alert
              severity="success"
              icon={<CheckCircle />}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={handleDisconnect}
                  disabled={disconnectMutation.isPending}
                  startIcon={disconnectMutation.isPending ? <CircularProgress size={16} /> : <LinkOff />}
                >
                  Disconnect
                </Button>
              }
            >
              <Typography variant="body2">
                <strong>Connected to Notion</strong>
                <br />
                Workspace: {notionStatus?.workspace_name || 'Unknown'}
              </Typography>
            </Alert>
          ) : (
            <Alert severity="info">
              <Typography variant="body2">
                Connect your Notion workspace to export BoQ data
              </Typography>
            </Alert>
          )}

          {/* Export Success */}
          {exportSuccess && notionPageUrl && (
            <Alert severity="success">
              <Typography variant="body2" fontWeight="bold" mb={1}>
                Successfully exported to Notion!
              </Typography>
              <Link
                href={notionPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                View in Notion <OpenInNew fontSize="small" />
              </Link>
            </Alert>
          )}

          {/* Export Error */}
          {exportMutation.isError && (
            <Alert severity="error">
              {(exportMutation.error as any)?.response?.data?.detail ||
                'Failed to export to Notion'}
            </Alert>
          )}

          <Divider />

          {/* Project Info */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Project
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {projectName}
            </Typography>
          </Box>

          {/* Export Details */}
          {isConnected && !exportSuccess && (
            <>
              <Typography variant="body2" color="text.secondary">
                This will create a new Notion page with:
              </Typography>
              <Box component="ul" sx={{ pl: 3, my: 0 }}>
                <Typography component="li" variant="body2">
                  📊 BoQ Database (all items)
                </Typography>
                <Typography component="li" variant="body2">
                  💰 Cost Summary
                </Typography>
                <Typography component="li" variant="body2">
                  📥 Download Links (CSV, Excel, PDF)
                </Typography>
              </Box>
            </>
          )}

          {/* Connection Benefits */}
          {!isConnected && (
            <>
              <Typography variant="body2" color="text.secondary">
                After connecting, you'll be able to:
              </Typography>
              <Box component="ul" sx={{ pl: 3, my: 0 }}>
                <Typography component="li" variant="body2">
                  ✅ Export BoQ as Notion database
                </Typography>
                <Typography component="li" variant="body2">
                  ✅ Share with team members
                </Typography>
                <Typography component="li" variant="body2">
                  ✅ Add custom views and filters
                </Typography>
                <Typography component="li" variant="body2">
                  ✅ Access download links
                </Typography>
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={exportMutation.isPending}>
          Close
        </Button>

        {!isConnected ? (
          <Button
            variant="contained"
            onClick={handleConnectNotion}
            startIcon={<SiNotion />}
          >
            Connect Notion
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleExport}
            disabled={exportMutation.isPending || exportSuccess}
            startIcon={
              exportMutation.isPending ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <SiNotion />
              )
            }
          >
            {exportMutation.isPending
              ? 'Exporting...'
              : exportSuccess
              ? 'Exported'
              : 'Export to Notion'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
