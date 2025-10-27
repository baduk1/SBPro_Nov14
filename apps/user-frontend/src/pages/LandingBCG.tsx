import { Box, Button, Container, Grid, Stack, Typography, Divider, Link, Paper } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp,
  Speed,
  Security,
  Construction,
  AttachMoney,
  Engineering,
  ArrowForward,
  Architecture,
  Layers,
  Assessment
} from '@mui/icons-material'

export default function LandingBCG() {
  const navigate = useNavigate()

  // SVG Construction Pattern Background
  const ConstructionPattern = () => (
    <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, opacity: 0.03 }}>
      <defs>
        <pattern id="construction-grid" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <rect width="80" height="80" fill="none" stroke="#1976d2" strokeWidth="1"/>
          <line x1="0" y1="0" x2="80" y2="80" stroke="#1976d2" strokeWidth="0.5"/>
          <line x1="80" y1="0" x2="0" y2="80" stroke="#1976d2" strokeWidth="0.5"/>
          <circle cx="40" cy="40" r="3" fill="#1976d2"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#construction-grid)" />
    </svg>
  )

  return (
    <Box sx={{ bgcolor: 'white' }}>
      {/* Minimalist Header */}
      <Box
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: 2,
          bgcolor: 'white',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Architecture sx={{ fontSize: 28, color: '#1976d2' }} />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: '#000',
                  letterSpacing: '0.5px'
                }}
              >
                SKYBUILD PRO
              </Typography>
            </Stack>
            <Stack direction="row" spacing={3}>
              <Link
                href="#capabilities"
                underline="none"
                sx={{
                  color: 'text.primary',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  '&:hover': { color: 'primary.main' }
                }}
              >
                CAPABILITIES
              </Link>
              <Link
                href="#industries"
                underline="none"
                sx={{
                  color: 'text.primary',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  '&:hover': { color: 'primary.main' }
                }}
              >
                INDUSTRIES
              </Link>
              <Button
                onClick={() => navigate('/app/signin')}
                sx={{
                  color: 'text.primary',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  textTransform: 'none'
                }}
              >
                Sign In
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Hero Section with Architectural Visualization */}
      <Box sx={{ position: 'relative', overflow: 'hidden' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 14 }, position: 'relative', zIndex: 2 }}>
          <Grid container spacing={6}>
            <Grid item xs={12} md={7}>
              <Typography
                variant="overline"
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '1.5px',
                  color: '#1976d2',
                  mb: 2,
                  display: 'block'
                }}
              >
                CONSTRUCTION INTELLIGENCE
              </Typography>
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: '2.5rem', md: '3.75rem' },
                  fontWeight: 300,
                  lineHeight: 1.2,
                  mb: 3,
                  color: '#000'
                }}
              >
                Transform Construction
                <br />
                <Box component="span" sx={{ fontWeight: 700 }}>
                  Cost Estimation
                </Box>
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontSize: '1.125rem',
                  lineHeight: 1.8,
                  color: 'text.secondary',
                  mb: 4,
                  maxWidth: 600
                }}
              >
                Leverage AI-powered automation to deliver accurate quantity takeoffs and cost estimates in minutes, not days. Purpose-built for quantity surveyors and construction professionals.
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  onClick={() => navigate('/app/signup')}
                  endIcon={<ArrowForward />}
                  sx={{
                    bgcolor: '#000',
                    color: 'white',
                    px: 4,
                    py: 1.5,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    '&:hover': {
                      bgcolor: '#333'
                    }
                  }}
                >
                  Get Started
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => window.open('https://calendly.com/skybuild-demo', '_blank')}
                  sx={{
                    borderColor: '#000',
                    color: '#000',
                    px: 4,
                    py: 1.5,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: '#000',
                      bgcolor: 'rgba(0,0,0,0.05)'
                    }
                  }}
                >
                  Book Consultation
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box
                sx={{
                  bgcolor: '#f5f5f5',
                  p: 4,
                  borderRadius: 0,
                  border: '1px solid',
                  borderColor: 'divider',
                  position: 'relative'
                }}
              >
                {/* Blueprint-style corner markers */}
                {[
                  { top: -1, left: -1 },
                  { top: -1, right: -1 },
                  { bottom: -1, left: -1 },
                  { bottom: -1, right: -1 }
                ].map((pos, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      position: 'absolute',
                      ...pos,
                      width: 20,
                      height: 20,
                      border: '2px solid #1976d2',
                      borderRight: pos.left !== undefined ? 'none' : undefined,
                      borderLeft: pos.right !== undefined ? 'none' : undefined,
                      borderBottom: pos.top !== undefined ? 'none' : undefined,
                      borderTop: pos.bottom !== undefined ? 'none' : undefined
                    }}
                  />
                ))}
                
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: '#000' }}>
                  Key Performance Indicators
                </Typography>
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700, color: '#1976d2' }}>
                      80%
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Reduction in takeoff time
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700, color: '#1976d2' }}>
                      95%
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Cost estimation accuracy
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700, color: '#1976d2' }}>
                      $2.5M
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Average annual savings per firm
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Container>

        {/* Architectural Grid Background */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '50%',
            height: '100%',
            opacity: 0.02,
            pointerEvents: 'none'
          }}
        >
          <ConstructionPattern />
        </Box>
      </Box>

      {/* Process Visualization */}
      <Box sx={{ bgcolor: '#fafafa', py: 6, borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Grid container spacing={2} alignItems="center">
            {[
              { icon: <Layers />, label: 'Upload BIM/CAD' },
              { icon: <Assessment />, label: 'AI Analysis' },
              { icon: <AttachMoney />, label: 'Price Matching' },
              { icon: <Engineering />, label: 'Export Estimate' }
            ].map((step, idx) => (
              <React.Fragment key={idx}>
                <Grid item xs={12} sm={3}>
                  <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        border: '2px solid #1976d2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'white'
                      }}
                    >
                      {React.cloneElement(step.icon, { sx: { fontSize: 24, color: '#1976d2' } })}
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {step.label}
                    </Typography>
                  </Stack>
                </Grid>
                {idx < 3 && (
                  <Grid item xs={0} sm={'auto'} sx={{ display: { xs: 'none', sm: 'block' } }}>
                    <ArrowForward sx={{ color: 'divider' }} />
                  </Grid>
                )}
              </React.Fragment>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Capabilities Section */}
      <Box id="capabilities" sx={{ bgcolor: 'white', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Typography
            variant="overline"
            sx={{
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '1.5px',
              color: '#1976d2'
            }}
          >
            CAPABILITIES
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 300, mb: 6, mt: 1, color: '#000' }}>
            Comprehensive
            <Box component="span" sx={{ fontWeight: 700 }}> Takeoff Solutions</Box>
          </Typography>

          <Grid container spacing={4}>
            {[
              {
                icon: <Construction sx={{ fontSize: 40 }} />,
                title: 'Automated Quantity Takeoff',
                description: 'Extract quantities from IFC, DWG, DXF, and PDF files using advanced AI recognition algorithms trained on construction data.',
                metric: '10min',
                metricLabel: 'Average processing'
              },
              {
                icon: <AttachMoney sx={{ fontSize: 40 }} />,
                title: 'Intelligent Price Application',
                description: 'Seamlessly apply supplier price lists with AI-powered code matching to eliminate manual entry and reduce errors.',
                metric: '95%',
                metricLabel: 'Matching accuracy'
              },
              {
                icon: <Speed sx={{ fontSize: 40 }} />,
                title: 'Rapid Cost Estimation',
                description: 'Generate comprehensive cost estimates in minutes with multi-supplier price comparison and adjustment capabilities.',
                metric: '80%',
                metricLabel: 'Time saved'
              },
              {
                icon: <TrendingUp sx={{ fontSize: 40 }} />,
                title: 'Template Management',
                description: 'Create reusable templates for recurring project types to standardize your estimation process across teams.',
                metric: 'Unlimited',
                metricLabel: 'Templates'
              },
              {
                icon: <Engineering sx={{ fontSize: 40 }} />,
                title: 'Multi-Format Export',
                description: 'Export detailed BOQ and estimates to CSV, Excel, or branded PDF with customizable layouts and formatting.',
                metric: '3',
                metricLabel: 'Export formats'
              },
              {
                icon: <Security sx={{ fontSize: 40 }} />,
                title: 'Enterprise Security',
                description: 'Multi-tenant architecture with role-based access control and data encryption ensuring project confidentiality.',
                metric: '99.9%',
                metricLabel: 'Uptime SLA'
              }
            ].map((capability, idx) => (
              <Grid item xs={12} md={4} key={idx}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.3s',
                    '&:hover': {
                      borderColor: '#1976d2',
                      boxShadow: '0 8px 24px rgba(25,118,210,0.12)'
                    }
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box sx={{ color: '#1976d2' }}>
                      {capability.icon}
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2', lineHeight: 1 }}>
                        {capability.metric}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {capability.metricLabel}
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      mb: 1.5,
                      color: '#000'
                    }}
                  >
                    {capability.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      lineHeight: 1.7
                    }}
                  >
                    {capability.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Industries Section */}
      <Box id="industries" sx={{ bgcolor: '#f9f9f9', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Typography
            variant="overline"
            sx={{
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '1.5px',
              color: '#1976d2'
            }}
          >
            INDUSTRIES
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 300, mb: 6, mt: 1, color: '#000' }}>
            Serving Construction
            <Box component="span" sx={{ fontWeight: 700 }}> Professionals</Box>
          </Typography>

          <Grid container spacing={4}>
            {[
              {
                title: 'General Contractors',
                description: 'Accelerate bid preparation with automated takeoffs from architectural and structural drawings.',
                count: '500+'
              },
              {
                title: 'Quantity Surveyors',
                description: 'Deliver precise cost estimates faster with AI-powered element recognition and price matching.',
                count: '1,200+'
              },
              {
                title: 'Construction Estimators',
                description: 'Manage multiple supplier price lists and generate comparative cost analyses instantly.',
                count: '800+'
              },
              {
                title: 'Project Managers',
                description: 'Track project costs with template-based estimation and real-time BOQ adjustments.',
                count: '300+'
              }
            ].map((industry, idx) => (
              <Grid item xs={12} sm={6} key={idx}>
                <Box
                  sx={{
                    borderLeft: '4px solid',
                    borderColor: '#1976d2',
                    pl: 3,
                    py: 2,
                    bgcolor: 'white',
                    height: '100%'
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#000' }}>
                      {industry.title}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2' }}>
                      {industry.count}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {industry.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Call to Action */}
      <Box sx={{ bgcolor: '#000', color: 'white', py: { xs: 8, md: 10 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h3" sx={{ fontWeight: 300, mb: 2 }}>
                Ready to
                <Box component="span" sx={{ fontWeight: 700 }}> Transform</Box>
                <br />
                Your Estimation Process?
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, fontSize: '1.125rem' }}>
                Join leading construction firms leveraging AI for competitive advantage.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack spacing={2}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => navigate('/app/signup')}
                  sx={{
                    bgcolor: 'white',
                    color: '#000',
                    py: 1.5,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    '&:hover': {
                      bgcolor: '#f5f5f5'
                    }
                  }}
                >
                  Start Free Trial
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => window.open('https://calendly.com/skybuild-demo', '_blank')}
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    py: 1.5,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  Schedule Consultation
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: '#f9f9f9', py: 6, borderTop: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={3}>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <Architecture sx={{ color: '#1976d2', fontSize: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#000' }}>
                  SKYBUILD PRO
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                AI-powered construction takeoff and estimation platform
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: '#000' }}>
                CAPABILITIES
              </Typography>
              <Stack spacing={1}>
                <Link href="#" underline="none" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                  Automated Takeoff
                </Link>
                <Link href="#" underline="none" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                  Price Application
                </Link>
                <Link href="#" underline="none" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                  Cost Estimation
                </Link>
              </Stack>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: '#000' }}>
                INDUSTRIES
              </Typography>
              <Stack spacing={1}>
                <Link href="#" underline="none" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                  General Contractors
                </Link>
                <Link href="#" underline="none" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                  Quantity Surveyors
                </Link>
                <Link href="#" underline="none" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                  Estimators
                </Link>
              </Stack>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: '#000' }}>
                COMPANY
              </Typography>
              <Stack spacing={1}>
                <Link href="#" underline="none" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                  About Us
                </Link>
                <Link href="#" underline="none" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                  Contact
                </Link>
                <Link href="#" underline="none" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                  Privacy Policy
                </Link>
              </Stack>
            </Grid>
          </Grid>
          <Box sx={{ mt: 6, pt: 4, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              © {new Date().getFullYear()} SkyBuild Pro. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  )
}

// Add React import at the top
import React from 'react'
