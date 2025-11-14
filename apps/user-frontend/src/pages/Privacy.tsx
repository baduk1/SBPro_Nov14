/**
 * Privacy Policy Page
 */

import { Box, Container, Typography, Paper, Link } from '@mui/material'
import { useNavigate } from 'react-router-dom'

export default function Privacy() {
  const navigate = useNavigate()

  return (
    <Box sx={{ minHeight: '100vh', py: 4 }}>
      <Container maxWidth="md">
        <Paper sx={{ p: 4 }}>
          <Typography variant="h3" gutterBottom>
            Privacy Policy
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Last Updated: November 13, 2025
          </Typography>

          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              1. Introduction
            </Typography>
            <Typography variant="body1" paragraph>
              Welcome to SkyBuild Pro ("we," "our," or "us"). We are committed to protecting your
              privacy and ensuring the security of your personal information. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you use
              our construction project management platform.
            </Typography>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              2. Information We Collect
            </Typography>
            <Typography variant="h6" gutterBottom sx={{ mt: 2, fontSize: '1.1rem' }}>
              2.1 Personal Information
            </Typography>
            <Typography variant="body1" paragraph>
              We collect the following personal information:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1">
                Account information (name, email address, password)
              </Typography>
              <Typography component="li" variant="body1">
                Company information (organization name, role)
              </Typography>
              <Typography component="li" variant="body1">
                Profile information (optional profile picture, bio)
              </Typography>
            </Box>

            <Typography variant="h6" gutterBottom sx={{ mt: 2, fontSize: '1.1rem' }}>
              2.2 Project Data
            </Typography>
            <Typography variant="body1" paragraph>
              We collect and store:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1">
                Project files (IFC, DWG, PDF documents)
              </Typography>
              <Typography component="li" variant="body1">
                Bill of Quantities (BoQ) data
              </Typography>
              <Typography component="li" variant="body1">
                Task management data (tasks, comments, attachments)
              </Typography>
              <Typography component="li" variant="body1">
                Collaboration data (team members, permissions, activity logs)
              </Typography>
            </Box>

            <Typography variant="h6" gutterBottom sx={{ mt: 2, fontSize: '1.1rem' }}>
              2.3 Usage Information
            </Typography>
            <Typography variant="body1" paragraph>
              We automatically collect:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1">
                Log data (IP address, browser type, pages visited)
              </Typography>
              <Typography component="li" variant="body1">
                Device information (device type, operating system)
              </Typography>
              <Typography component="li" variant="body1">
                Usage patterns (features used, time spent)
              </Typography>
              <Typography component="li" variant="body1">
                Error reports and performance data (via Sentry)
              </Typography>
            </Box>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              3. How We Use Your Information
            </Typography>
            <Typography variant="body1" paragraph>
              We use your information to:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1">
                Provide and maintain our services
              </Typography>
              <Typography component="li" variant="body1">
                Process your construction project files (IFC, DWG, PDF)
              </Typography>
              <Typography component="li" variant="body1">
                Enable collaboration features (real-time updates, comments)
              </Typography>
              <Typography component="li" variant="body1">
                Send service-related notifications (project updates, task assignments)
              </Typography>
              <Typography component="li" variant="body1">
                Improve our services and develop new features
              </Typography>
              <Typography component="li" variant="body1">
                Monitor and analyze usage patterns
              </Typography>
              <Typography component="li" variant="body1">
                Detect, prevent, and address technical issues
              </Typography>
              <Typography component="li" variant="body1">
                Comply with legal obligations
              </Typography>
            </Box>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              4. Third-Party Services
            </Typography>
            <Typography variant="body1" paragraph>
              We integrate with the following third-party services:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1">
                <strong>OpenAI:</strong> For PDF document processing and BoQ extraction. Your PDF
                files are sent to OpenAI's API for analysis. See{' '}
                <Link href="https://openai.com/privacy" target="_blank" rel="noopener">
                  OpenAI Privacy Policy
                </Link>
                .
              </Typography>
              <Typography component="li" variant="body1">
                <strong>Notion:</strong> For exporting BoQ data to your Notion workspace (optional).
                See{' '}
                <Link href="https://www.notion.so/Privacy-Policy" target="_blank" rel="noopener">
                  Notion Privacy Policy
                </Link>
                .
              </Typography>
              <Typography component="li" variant="body1">
                <strong>Sentry:</strong> For error tracking and performance monitoring. See{' '}
                <Link href="https://sentry.io/privacy/" target="_blank" rel="noopener">
                  Sentry Privacy Policy
                </Link>
                .
              </Typography>
            </Box>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              5. Data Storage and Security
            </Typography>
            <Typography variant="body1" paragraph>
              We implement appropriate technical and organizational measures to protect your data:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1">
                Encrypted data transmission (HTTPS/TLS)
              </Typography>
              <Typography component="li" variant="body1">
                Encrypted password storage (bcrypt hashing)
              </Typography>
              <Typography component="li" variant="body1">
                Secure file storage with access controls
              </Typography>
              <Typography component="li" variant="body1">
                Regular security audits and updates
              </Typography>
              <Typography component="li" variant="body1">
                Rate limiting and authentication protection
              </Typography>
            </Box>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              6. Data Retention
            </Typography>
            <Typography variant="body1" paragraph>
              We retain your data for as long as your account is active or as needed to provide
              services. You may request deletion of your account and associated data at any time.
              Some data may be retained for legal compliance or legitimate business purposes.
            </Typography>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              7. Your Rights
            </Typography>
            <Typography variant="body1" paragraph>
              You have the right to:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1">
                Access your personal information
              </Typography>
              <Typography component="li" variant="body1">
                Correct inaccurate data
              </Typography>
              <Typography component="li" variant="body1">
                Request deletion of your data
              </Typography>
              <Typography component="li" variant="body1">
                Export your data (CSV, Excel, PDF)
              </Typography>
              <Typography component="li" variant="body1">
                Opt-out of email notifications (except essential service emails)
              </Typography>
              <Typography component="li" variant="body1">
                Disconnect third-party integrations (Notion, etc.)
              </Typography>
            </Box>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              8. Cookies and Tracking
            </Typography>
            <Typography variant="body1" paragraph>
              We use essential cookies for authentication and session management. We do not use
              third-party advertising cookies. You can control cookies through your browser
              settings, but disabling cookies may affect functionality.
            </Typography>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              9. International Data Transfers
            </Typography>
            <Typography variant="body1" paragraph>
              Your data may be transferred to and processed in countries other than your country of
              residence. We ensure appropriate safeguards are in place for such transfers.
            </Typography>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              10. Children's Privacy
            </Typography>
            <Typography variant="body1" paragraph>
              Our service is not directed to individuals under 18 years of age. We do not knowingly
              collect personal information from children.
            </Typography>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              11. Changes to This Privacy Policy
            </Typography>
            <Typography variant="body1" paragraph>
              We may update this Privacy Policy from time to time. We will notify you of
              significant changes via email or through the service. Your continued use after
              changes constitutes acceptance.
            </Typography>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              12. Contact Us
            </Typography>
            <Typography variant="body1" paragraph>
              If you have questions about this Privacy Policy or our privacy practices, contact us
              at:
            </Typography>
            <Typography variant="body1" paragraph>
              Email: privacy@skybuild.com
              <br />
              Address: [Your Company Address]
            </Typography>

            <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary" align="center">
                <Link
                  component="button"
                  onClick={() => navigate('/')}
                  sx={{ mr: 2, cursor: 'pointer' }}
                >
                  Back to Home
                </Link>
                <Link
                  component="button"
                  onClick={() => navigate('/terms')}
                  sx={{ cursor: 'pointer' }}
                >
                  Terms of Service
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}
