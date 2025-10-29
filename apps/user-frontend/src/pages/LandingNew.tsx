import { Box, Button, Container, Grid, Stack, Typography, Card, CardContent, Chip, AppBar, Toolbar } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import {
  CloudUpload as UploadIcon,
  Speed as SpeedIcon,
  AttachMoney as MoneyIcon,
  CheckCircle as CheckIcon,
  ArrowForward as ArrowIcon,
  Login as LoginIcon
} from '@mui/icons-material'

export default function LandingNew() {
  const navigate = useNavigate()

  const features = [
    {
      icon: <UploadIcon sx={{ fontSize: 48 }} color="primary" />,
      title: 'Automated Takeoff',
      description: 'Upload IFC, DWG, DXF, or PDF files and extract quantities automatically using AI-powered recognition.'
    },
    {
      icon: <SpeedIcon sx={{ fontSize: 48 }} color="success" />,
      title: 'Save 80% Time',
      description: 'What used to take 2-3 days now takes minutes. Focus on winning bids, not manual data entry.'
    },
    {
      icon: <MoneyIcon sx={{ fontSize: 48 }} color="warning" />,
      title: 'Accurate Pricing',
      description: 'Apply your supplier price lists instantly. AI suggests matching codes to eliminate errors.'
    }
  ]

  const benefits = [
    'Extract quantities from BIM/CAD models in seconds',
    'AI-powered element recognition and mapping',
    'Multi-supplier price comparison',
    'Export to CSV, Excel, or branded PDF',
    'Manage unlimited suppliers and price lists',
    'Save templates for recurring projects'
  ]

  return (
    <Box>
      {/* Header */}
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{ 
          bgcolor: 'white',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
          {/* Logo */}
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 700,
              color: '#667eea',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
            onClick={() => navigate('/')}
          >
            🏗️ SkyBuild Pro
          </Typography>

          {/* Auth Buttons */}
          <Stack direction="row" spacing={2}>
            <Button
              variant="text"
              onClick={() => navigate('/app/signin')}
              startIcon={<LoginIcon />}
              sx={{
                color: 'text.primary',
                fontWeight: 500,
                textTransform: 'none',
                fontSize: '1rem',
                px: 2,
                '&:hover': {
                  bgcolor: 'rgba(102, 126, 234, 0.08)'
                }
              }}
            >
              Sign In
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate('/app/signup')}
              sx={{
                bgcolor: '#667eea',
                color: 'white',
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '1rem',
                px: 3,
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: '#5568d3',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                }
              }}
            >
              Start Free Trial
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Chip
                label="🚀 Free Trial - 2000 Credits"
                sx={{
                  mb: 2,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: 600
                }}
              />
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 800,
                  mb: 2,
                  fontSize: { xs: '2.5rem', md: '3.5rem' }
                }}
              >
                Construction Takeoff,
                <br />
                Automated with AI
              </Typography>
              <Typography variant="h6" sx={{ mb: 4, opacity: 0.95, lineHeight: 1.7 }}>
                Transform BIM and CAD files into accurate cost estimates in minutes.
                Used by quantity surveyors and contractors worldwide.
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/app/signup')}
                  endIcon={<ArrowIcon />}
                  sx={{
                    bgcolor: 'white',
                    color: '#667eea',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
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
                  size="large"
                  onClick={() => window.open('https://calendly.com/skybuild-demo', '_blank')}
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  Book Demo
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box
                sx={{
                  bgcolor: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 4,
                  p: 3,
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  ⚡ Quick Stats
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      80%
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Time saved on takeoff
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      95%
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Accuracy with AI matching
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      Minutes
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      To generate full estimate
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Container>

        {/* Decorative elements */}
        <Box
          sx={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            filter: 'blur(60px)'
          }}
        />
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Box textAlign="center" mb={6}>
          <Typography variant="overline" color="primary" sx={{ fontWeight: 600, fontSize: '1rem' }}>
            HOW IT WORKS
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 700, mt: 1, mb: 2 }}>
            From Upload to Estimate in 3 Steps
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            Our AI-powered platform handles the heavy lifting, so you can focus on winning projects.
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {features.map((feature, idx) => (
            <Grid item xs={12} md={4} key={idx}>
              <Card
                sx={{
                  height: '100%',
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 8
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                  <Box mb={2}>{feature.icon}</Box>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Benefits Section */}
      <Box sx={{ bgcolor: '#f9fafb', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 3 }}>
                Everything You Need to Win More Bids
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.8 }}>
                SkyBuild Pro combines advanced takeoff automation with flexible pricing tools,
                helping you deliver accurate estimates faster than ever.
              </Typography>
              <Stack spacing={2}>
                {benefits.map((benefit, idx) => (
                  <Stack direction="row" spacing={2} key={idx}>
                    <CheckIcon color="success" />
                    <Typography variant="body1">{benefit}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  bgcolor: 'white',
                  borderRadius: 4,
                  p: 4,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.1)'
                }}
              >
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                  💎 Free Trial Includes:
                </Typography>
                <Stack spacing={2} mt={3}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Credits</Typography>
                    <Typography sx={{ fontWeight: 600 }}>2,000 (≈10 projects)</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Suppliers</Typography>
                    <Typography sx={{ fontWeight: 600 }}>1 supplier</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Price Items</Typography>
                    <Typography sx={{ fontWeight: 600 }}>Unlimited</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Export Formats</Typography>
                    <Typography sx={{ fontWeight: 600 }}>CSV, XLSX, PDF</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Support</Typography>
                    <Typography sx={{ fontWeight: 600 }}>Email</Typography>
                  </Box>
                </Stack>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/app/signup')}
                  sx={{ mt: 4, py: 1.5, fontWeight: 600 }}
                >
                  Get Started Free
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: { xs: 8, md: 10 },
          textAlign: 'center'
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
            Ready to Transform Your Workflow?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.95 }}>
            Join hundreds of quantity surveyors saving 80% of their time
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/app/signup')}
              sx={{
                bgcolor: 'white',
                color: '#667eea',
                px: 5,
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: '#f5f5f5'
                }
              }}
            >
              Start Free Trial →
            </Button>
          </Stack>
          <Typography variant="body2" sx={{ mt: 3, opacity: 0.8 }}>
            No credit card required • 2,000 free credits • Cancel anytime
          </Typography>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: '#1a1a1a', color: 'white', py: 4 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                SkyBuild Pro
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                AI-powered construction takeoff and estimation platform
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Product
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2" sx={{ opacity: 0.7, cursor: 'pointer' }}>
                  Features
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.7, cursor: 'pointer' }}>
                  Pricing
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.7, cursor: 'pointer' }}>
                  Demo
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Company
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2" sx={{ opacity: 0.7, cursor: 'pointer' }}>
                  About
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.7, cursor: 'pointer' }}>
                  Contact
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.7, cursor: 'pointer' }}>
                  Privacy
                </Typography>
              </Stack>
            </Grid>
          </Grid>
          <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
            <Typography variant="body2" sx={{ opacity: 0.6 }}>
              © {new Date().getFullYear()} SkyBuild Pro. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  )
}
