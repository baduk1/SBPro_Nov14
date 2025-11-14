/**
 * Notion OAuth Callback Page
 *
 * Handles the OAuth redirect from Notion after user authorization
 * Completes the connection and redirects to Dashboard
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Stack,
} from '@mui/material';
import { CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import { SiNotion } from 'react-icons/si';
import { integrationsAPI } from '../services/integrations';

export default function NotionCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');

  useEffect(() => {
    // Check for OAuth error
    if (errorParam) {
      setError('Authorization cancelled or failed');
      setLoading(false);
      setTimeout(() => navigate('/app/dashboard'), 3000);
      return;
    }

    // Check for authorization code
    if (!code) {
      setError('No authorization code received');
      setLoading(false);
      setTimeout(() => navigate('/app/dashboard'), 3000);
      return;
    }

    // Complete OAuth connection
    const connect = async () => {
      try {
        const result = await integrationsAPI.connectNotion(code);
        setWorkspaceName(result.workspace_name);
        setSuccess(true);

        // Auto-redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate('/app/dashboard');
        }, 3000);
      } catch (err: any) {
        setError(
          err?.response?.data?.detail || 'Failed to connect to Notion'
        );
      } finally {
        setLoading(false);
      }
    };

    connect();
  }, [code, errorParam, navigate]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          p: 2,
        }}
      >
        <Paper sx={{ maxWidth: 500, p: 4, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <SiNotion size={60} />
          </Box>
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h5" sx={{ mb: 1 }}>
            Connecting to Notion...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please wait while we complete the connection
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (success) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          p: 2,
        }}
      >
        <Paper sx={{ maxWidth: 500, p: 4, textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
            Notion Connected!
          </Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Your Notion workspace has been connected successfully.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {workspaceName}
          </Typography>

          <Alert severity="success" sx={{ mb: 3, textAlign: 'left' }}>
            <strong>You're all set!</strong>
            <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
              <li>Export BoQ data to Notion pages</li>
              <li>Share with team members</li>
              <li>Create custom views and filters</li>
            </ul>
          </Alert>

          <Stack spacing={2}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/app/dashboard')}
            >
              Go to Dashboard
            </Button>
            <Typography variant="caption" color="text.secondary">
              Redirecting automatically in a few seconds...
            </Typography>
          </Stack>
        </Paper>
      </Box>
    );
  }

  // Error state
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        p: 2,
      }}
    >
      <Paper sx={{ maxWidth: 500, p: 4, textAlign: 'center' }}>
        <ErrorIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
          Connection Failed
        </Typography>
        <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
          {error}
        </Alert>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Common issues:
          <ul style={{ textAlign: 'left', marginTop: 8 }}>
            <li>Authorization was cancelled</li>
            <li>Invalid OAuth configuration</li>
            <li>Network connection issues</li>
          </ul>
        </Typography>

        <Stack spacing={2}>
          <Button
            variant="contained"
            onClick={() => navigate('/app/dashboard')}
          >
            Back to Dashboard
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              try {
                integrationsAPI.startNotionOAuth();
              } catch (e) {
                console.error('Failed to restart OAuth:', e);
              }
            }}
          >
            Try Again
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
