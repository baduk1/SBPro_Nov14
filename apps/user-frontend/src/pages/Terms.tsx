/**
 * Terms of Service Page
 */

import { Box, Container, Typography, Paper, Link } from '@mui/material'
import { useNavigate } from 'react-router-dom'

export default function Terms() {
  const navigate = useNavigate()

  return (
    <Box sx={{ minHeight: '100vh', py: 4 }}>
      <Container maxWidth="md">
        <Paper sx={{ p: 4 }}>
          <Typography variant="h3" gutterBottom>
            Terms of Service
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Last Updated: November 13, 2025
          </Typography>

          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              1. Acceptance of Terms
            </Typography>
            <Typography variant="body1" paragraph>
              By accessing or using SkyBuild Pro ("the Service"), you agree to be bound by these
              Terms of Service ("Terms"). If you do not agree to these Terms, do not use the
              Service. We reserve the right to modify these Terms at any time. Your continued use
              of the Service constitutes acceptance of any changes.
            </Typography>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              2. Description of Service
            </Typography>
            <Typography variant="body1" paragraph>
              SkyBuild Pro is a cloud-based construction project management platform that provides:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1">
                Bill of Quantities (BoQ) extraction from IFC, DWG, and PDF files
              </Typography>
              <Typography component="li" variant="body1">
                Project management and collaboration tools
              </Typography>
              <Typography component="li" variant="body1">
                Real-time task management (Kanban, Timeline, List views)
              </Typography>
              <Typography component="li" variant="body1">
                Data export functionality (CSV, Excel, PDF, Notion)
              </Typography>
              <Typography component="li" variant="body1">
                Team collaboration features (comments, mentions, attachments)
              </Typography>
            </Box>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              3. Account Registration
            </Typography>
            <Typography variant="body1" paragraph>
              To use the Service, you must:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1">
                Provide accurate and complete registration information
              </Typography>
              <Typography component="li" variant="body1">
                Be at least 18 years of age
              </Typography>
              <Typography component="li" variant="body1">
                Maintain the security of your account credentials
              </Typography>
              <Typography component="li" variant="body1">
                Notify us immediately of any unauthorized access
              </Typography>
              <Typography component="li" variant="body1">
                Accept responsibility for all activities under your account
              </Typography>
            </Box>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              4. User Responsibilities
            </Typography>
            <Typography variant="body1" paragraph>
              You agree to:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1">
                Use the Service in compliance with all applicable laws
              </Typography>
              <Typography component="li" variant="body1">
                Not upload malicious files or content
              </Typography>
              <Typography component="li" variant="body1">
                Not attempt to gain unauthorized access to the Service
              </Typography>
              <Typography component="li" variant="body1">
                Not use the Service to transmit spam or malware
              </Typography>
              <Typography component="li" variant="body1">
                Not reverse engineer or decompile the Service
              </Typography>
              <Typography component="li" variant="body1">
                Not violate intellectual property rights
              </Typography>
              <Typography component="li" variant="body1">
                Not resell or redistribute the Service without authorization
              </Typography>
            </Box>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              5. Data Ownership and License
            </Typography>
            <Typography variant="h6" gutterBottom sx={{ mt: 2, fontSize: '1.1rem' }}>
              5.1 Your Data
            </Typography>
            <Typography variant="body1" paragraph>
              You retain all ownership rights to your project data, files, and content uploaded to
              the Service. By using the Service, you grant us a limited license to:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1">
                Store and process your data to provide the Service
              </Typography>
              <Typography component="li" variant="body1">
                Use third-party services (OpenAI, Notion) to process your data as necessary
              </Typography>
              <Typography component="li" variant="body1">
                Create backups and ensure data redundancy
              </Typography>
            </Box>

            <Typography variant="h6" gutterBottom sx={{ mt: 2, fontSize: '1.1rem' }}>
              5.2 Our Intellectual Property
            </Typography>
            <Typography variant="body1" paragraph>
              The Service, including its software, design, and features, is owned by SkyBuild Pro
              and protected by intellectual property laws. You may not copy, modify, or distribute
              our intellectual property without permission.
            </Typography>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              6. Third-Party Services
            </Typography>
            <Typography variant="body1" paragraph>
              The Service integrates with third-party services:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1">
                <strong>OpenAI:</strong> PDF processing and BoQ extraction. Subject to{' '}
                <Link href="https://openai.com/terms" target="_blank" rel="noopener">
                  OpenAI Terms
                </Link>
                .
              </Typography>
              <Typography component="li" variant="body1">
                <strong>Notion:</strong> Optional BoQ export integration. Subject to{' '}
                <Link href="https://www.notion.so/Terms-and-Privacy" target="_blank" rel="noopener">
                  Notion Terms
                </Link>
                .
              </Typography>
            </Box>
            <Typography variant="body1" paragraph>
              We are not responsible for third-party service availability or terms. Your use of
              third-party integrations is subject to their respective terms of service.
            </Typography>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              7. Fees and Payment
            </Typography>
            <Typography variant="body1" paragraph>
              Some features may require payment:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1">
                Pricing is displayed on our website and subject to change
              </Typography>
              <Typography component="li" variant="body1">
                Fees are non-refundable except as required by law
              </Typography>
              <Typography component="li" variant="body1">
                You authorize us to charge your payment method on file
              </Typography>
              <Typography component="li" variant="body1">
                Failure to pay may result in service suspension or termination
              </Typography>
            </Box>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              8. Service Availability
            </Typography>
            <Typography variant="body1" paragraph>
              We strive to provide 99.9% uptime, but do not guarantee uninterrupted service. The
              Service may be unavailable due to:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1">
                Scheduled maintenance
              </Typography>
              <Typography component="li" variant="body1">
                Emergency repairs
              </Typography>
              <Typography component="li" variant="body1">
                Third-party service outages
              </Typography>
              <Typography component="li" variant="body1">
                Force majeure events
              </Typography>
            </Box>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              9. Limitation of Liability
            </Typography>
            <Typography variant="body1" paragraph>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1">
                THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND
              </Typography>
              <Typography component="li" variant="body1">
                WE ARE NOT LIABLE FOR DATA LOSS, CORRUPTION, OR INACCURACY
              </Typography>
              <Typography component="li" variant="body1">
                WE ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES
              </Typography>
              <Typography component="li" variant="body1">
                OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID IN THE LAST 12 MONTHS
              </Typography>
            </Box>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              10. Data Accuracy and Professional Advice
            </Typography>
            <Typography variant="body1" paragraph>
              The BoQ extraction and project data provided by the Service are generated using
              automated tools and AI. While we strive for accuracy:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1">
                Results should be verified by qualified professionals
              </Typography>
              <Typography component="li" variant="body1">
                The Service does not constitute professional engineering or construction advice
              </Typography>
              <Typography component="li" variant="body1">
                We are not responsible for decisions made based on Service output
              </Typography>
              <Typography component="li" variant="body1">
                You should consult licensed professionals for critical decisions
              </Typography>
            </Box>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              11. Indemnification
            </Typography>
            <Typography variant="body1" paragraph>
              You agree to indemnify and hold harmless SkyBuild Pro, its officers, directors, and
              employees from any claims, damages, or expenses arising from:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1">
                Your use of the Service
              </Typography>
              <Typography component="li" variant="body1">
                Your violation of these Terms
              </Typography>
              <Typography component="li" variant="body1">
                Your violation of third-party rights
              </Typography>
              <Typography component="li" variant="body1">
                Content you upload to the Service
              </Typography>
            </Box>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              12. Termination
            </Typography>
            <Typography variant="body1" paragraph>
              We may suspend or terminate your account:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1">
                For violation of these Terms
              </Typography>
              <Typography component="li" variant="body1">
                For non-payment of fees
              </Typography>
              <Typography component="li" variant="body1">
                For abusive or fraudulent behavior
              </Typography>
              <Typography component="li" variant="body1">
                At our discretion with or without cause
              </Typography>
            </Box>
            <Typography variant="body1" paragraph>
              Upon termination, you may export your data within 30 days. After that, we may delete
              your data.
            </Typography>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              13. Dispute Resolution
            </Typography>
            <Typography variant="body1" paragraph>
              Any disputes shall be resolved through:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1">
                Good faith negotiation first
              </Typography>
              <Typography component="li" variant="body1">
                Binding arbitration if negotiation fails
              </Typography>
              <Typography component="li" variant="body1">
                Governed by the laws of [Your Jurisdiction]
              </Typography>
            </Box>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              14. Governing Law
            </Typography>
            <Typography variant="body1" paragraph>
              These Terms are governed by the laws of [Your Jurisdiction], without regard to
              conflict of law principles. You consent to the exclusive jurisdiction of courts in
              [Your Jurisdiction].
            </Typography>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              15. Severability
            </Typography>
            <Typography variant="body1" paragraph>
              If any provision of these Terms is found invalid or unenforceable, the remaining
              provisions shall remain in full force and effect.
            </Typography>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              16. Entire Agreement
            </Typography>
            <Typography variant="body1" paragraph>
              These Terms, together with our Privacy Policy, constitute the entire agreement
              between you and SkyBuild Pro regarding the Service.
            </Typography>

            <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
              17. Contact Information
            </Typography>
            <Typography variant="body1" paragraph>
              For questions about these Terms, contact us at:
            </Typography>
            <Typography variant="body1" paragraph>
              Email: legal@skybuild.com
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
                  onClick={() => navigate('/privacy')}
                  sx={{ cursor: 'pointer' }}
                >
                  Privacy Policy
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}
