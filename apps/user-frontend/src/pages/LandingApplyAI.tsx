import React from 'react'
import { Box, Button, Container, Grid, Stack, Typography, Chip, Paper, Avatar, LinearProgress } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import {
  AutoAwesome,
  Bolt,
  CloudUpload,
  DataObject,
  Psychology,
  Speed,
  Verified,
  ArrowForward,
  TrendingUp,
  Timeline,
  Storage,
  Api
} from '@mui/icons-material'

export default function LandingApplyAI() {
  const navigate = useNavigate()

  return (
    <Box sx={{ bgcolor: '#ffffff' }}>
      {/* Modern Header */}
      <Box
        sx={{
          background: 'linear-gradient(to right, rgba(99, 102, 241, 0.03) 0%, rgba(139, 92, 246, 0.03) 100%)',
          borderBottom: '1px solid rgba(99,102,241,0.1)',
          backdropFilter: 'blur(10px)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <Container maxWidth="lg" sx={{ py: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <AutoAwesome sx={{ color: 'white', fontSize: 20 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
                SkyBuild Pro
              </Typography>
              <Chip
                label="AI"
                size="small"
                sx={{
                  ml: 1,
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  height: 22,
                  '& .MuiChip-label': { px: 1.5 }
                }}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <Button
                onClick={() => navigate('/app/signin')}
                sx={{
                  color: '#4a5568',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    color: '#6366f1',
                    bgcolor: 'rgba(99,102,241,0.05)'
                  }
                }}
              >
                Sign in
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate('/app/signup')}
                sx={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5558e3 0%, #7c4ee3 100%)',
                    boxShadow: '0 6px 16px rgba(99,102,241,0.4)'
                  }
                }}
              >
                Get Started
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Hero Section - Light Professional */}
      <Box sx={{ background: 'linear-gradient(180deg, rgba(99,102,241,0.03) 0%, rgba(255,255,255,1) 100%)' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 14 } }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={7}>
              <Stack spacing={3}>
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                  <Chip
                    icon={<Bolt sx={{ fontSize: 16 }} />}
                    label="AI-Powered"
                    size="small"
                    sx={{
                      bgcolor: 'rgba(99, 102, 241, 0.1)',
                      color: '#6366f1',
                      fontWeight: 600,
                      border: '1px solid rgba(99, 102, 241, 0.2)'
                    }}
                  />
                  <Chip
                    label="2,000 Free Credits"
                    size="small"
                    sx={{
                      bgcolor: 'rgba(34, 197, 94, 0.1)',
                      color: '#16a34a',
                      fontWeight: 600,
                      border: '1px solid rgba(34, 197, 94, 0.2)'
                    }}
                  />
                  <Chip
                    icon={<Verified sx={{ fontSize: 14 }} />}
                    label="Enterprise Ready"
                    size="small"
                    sx={{
                      bgcolor: 'rgba(139, 92, 246, 0.1)',
                      color: '#7c3aed',
                      fontWeight: 600,
                      border: '1px solid rgba(139, 92, 246, 0.2)'
                    }}
                  />
                </Stack>

                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: '2.5rem', md: '3.75rem' },
                    fontWeight: 800,
                    lineHeight: 1.15,
                    color: '#1a1a1a',
                    letterSpacing: '-0.02em'
                  }}
                >
                  Construction Takeoff
                  <br />
                  <Box
                    component="span"
                    sx={{
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                  >
                    Powered by AI
                  </Box>
                </Typography>

                <Typography
                  variant="h6"
                  sx={{
                    fontSize: '1.25rem',
                    lineHeight: 1.6,
                    color: '#4a5568',
                    fontWeight: 400,
                    maxWidth: 600
                  }}
                >
                  Transform IFC, DWG, DXF, and PDF files into accurate cost estimates in minutes. Our AI extracts quantities automatically with 95% accuracy.
                </Typography>

                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigate('/app/signup')}
                    endIcon={<ArrowForward />}
                    sx={{
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      px: 4,
                      py: 1.8,
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      textTransform: 'none',
                      borderRadius: 2,
                      boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5558e3 0%, #7c4ee3 100%)',
                        boxShadow: '0 12px 32px rgba(99, 102, 241, 0.45)'
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
                      borderColor: '#6366f1',
                      color: '#6366f1',
                      px: 4,
                      py: 1.8,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: 2,
                      borderWidth: 2,
                      '&:hover': {
                        borderColor: '#5558e3',
                        borderWidth: 2,
                        bgcolor: 'rgba(99, 102, 241, 0.05)'
                      }
                    }}
                  >
                    Watch Demo
                  </Button>
                </Stack>

                <Stack direction="row" spacing={4} sx={{ mt: 4 }}>
                  {[
                    { value: '10min', label: 'To first estimate', color: '#6366f1' },
                    { value: '95%', label: 'Accuracy', color: '#8b5cf6' },
                    { value: '80%', label: 'Time saved', color: '#ec4899' }
                  ].map((stat, idx) => (
                    <Box key={idx}>
                      <Typography variant="h4" sx={{ fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                        {stat.value}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, fontSize: '0.7rem' }}>
                        {stat.label}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Stack>
            </Grid>

            <Grid item xs={12} md={5}>
              {/* AI System Status Card */}
              <Paper
                elevation={0}
                sx={{
                  position: 'relative',
                  borderRadius: 3,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'rgba(99, 102, 241, 0.15)',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
                  p: 4
                }}
              >
                <Stack spacing={3}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar
                      sx={{
                        bgcolor: 'white',
                        width: 56,
                        height: 56,
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)'
                      }}
                    >
                      <Psychology sx={{ fontSize: 32, color: '#6366f1' }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
                        AI Processing Engine
                      </Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#22c55e', animation: 'pulse 2s infinite' }} />
                        <Typography variant="body2" sx={{ color: '#16a34a', fontWeight: 600 }}>
                          All systems operational
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>

                  <Box sx={{ bgcolor: 'white', p: 2.5, borderRadius: 2, border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                    <Stack spacing={2.5}>
                      {[
                        { name: 'IFC Parser', status: 99, icon: <Storage /> },
                        { name: 'DWG Analyzer', status: 100, icon: <DataObject /> },
                        { name: 'AI Matcher', status: 97, icon: <Psychology /> },
                        { name: 'Price Engine', status: 100, icon: <Api /> }
                      ].map((service, idx) => (
                        <Stack key={idx} spacing={1}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={1} alignItems="center">
                              {React.cloneElement(service.icon, { sx: { fontSize: 18, color: '#6366f1' } })}
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                                {service.name}
                              </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#16a34a' }}>
                              {service.status}%
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={service.status}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: 'rgba(99, 102, 241, 0.1)',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)'
                              }
                            }}
                          />
                        </Stack>
                      ))}
                    </Stack>
                  </Box>

                  <Box sx={{ textAlign: 'center', pt: 1 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                      Real-time system performance monitoring
                    </Typography>
                  </Box>
                </Stack>

                {/* Decorative gradient orb */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: -50,
                    right: -50,
                    width: 200,
                    height: 200,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
                    pointerEvents: 'none'
                  }}
                />
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Grid */}
      <Box sx={{ bgcolor: '#fafafa', py: { xs: 8, md: 12 }, borderTop: '1px solid', borderColor: 'rgba(0,0,0,0.08)' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={8}>
            <Chip
              label="TECHNOLOGY"
              size="small"
              sx={{
                bgcolor: 'rgba(99, 102, 241, 0.1)',
                color: '#6366f1',
                fontWeight: 700,
                mb: 2,
                letterSpacing: 1
              }}
            />
            <Typography variant="h2" sx={{ fontWeight: 800, mb: 2, color: '#1a1a1a', fontSize: { xs: '2rem', md: '2.75rem' } }}>
              Built for Speed & Precision
            </Typography>
            <Typography variant="h6" sx={{ color: '#64748b', maxWidth: 700, mx: 'auto', fontWeight: 400 }}>
              AI models trained on millions of construction elements to deliver industry-leading accuracy
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {[
              {
                icon: <CloudUpload />,
                title: 'Universal File Support',
                description: 'Upload IFC, DWG, DXF, or PDF files. Our AI understands all major construction file formats.',
                gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                metric: '4 formats'
              },
              {
                icon: <DataObject />,
                title: 'Smart Element Extraction',
                description: 'AI automatically identifies walls, slabs, columns, and 50+ other construction elements.',
                gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                metric: '50+ elements'
              },
              {
                icon: <Psychology />,
                title: 'Intelligent Matching',
                description: 'Matches elements to your supplier price lists with 95% accuracy using machine learning.',
                gradient: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                metric: '95% accuracy'
              },
              {
                icon: <Speed />,
                title: 'Rapid Estimation',
                description: 'Generate complete BOQ and cost estimates in under 10 minutes for typical projects.',
                gradient: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
                metric: '<10 minutes'
              },
              {
                icon: <TrendingUp />,
                title: 'Multi-Supplier Pricing',
                description: 'Compare prices from unlimited suppliers instantly. Always find the most competitive rates.',
                gradient: 'linear-gradient(135deg, #f43f5e 0%, #f97316 100%)',
                metric: 'Unlimited'
              },
              {
                icon: <Timeline />,
                title: 'Professional Export',
                description: 'Export to CSV, Excel, or branded PDF with customizable layouts and formatting options.',
                gradient: 'linear-gradient(135deg, #f97316 0%, #eab308 100%)',
                metric: '3 formats'
              }
            ].map((feature, idx) => (
              <Grid item xs={12} sm={6} md={4} key={idx}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3.5,
                    height: '100%',
                    bgcolor: 'white',
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 3,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      borderColor: 'rgba(99, 102, 241, 0.3)',
                      boxShadow: '0 20px 40px rgba(99, 102, 241, 0.15)'
                    }
                  }}
                >
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: feature.gradient,
                      mb: 2.5,
                      boxShadow: `0 8px 16px ${feature.gradient.match(/#[a-f0-9]{6}/i)?.[0]}33`
                    }}
                  >
                    {React.cloneElement(feature.icon, { sx: { fontSize: 28, color: 'white' } })}
                  </Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a1a1a', flex: 1 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#6366f1', bgcolor: 'rgba(99, 102, 241, 0.1)', px: 1.5, py: 0.5, borderRadius: 1 }}>
                      {feature.metric}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.7 }}>
                    {feature.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Social Proof */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Box textAlign="center" mb={6}>
          <Chip
            label="TRUSTED BY PROFESSIONALS"
            size="small"
            sx={{
              bgcolor: 'rgba(34, 197, 94, 0.1)',
              color: '#16a34a',
              fontWeight: 700,
              mb: 2,
              letterSpacing: 1
            }}
          />
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, color: '#1a1a1a' }}>
            Used by Leading Construction Firms
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {[
            { role: 'Quantity Surveyor, Major Contractor', feedback: 'Reduced our takeoff time from 2 days to 2 hours. The accuracy is remarkable.', name: 'David M.' },
            { role: 'Construction Estimator, Mid-size Firm', feedback: 'The AI price matching saves us countless hours. Worth every penny.', name: 'Sarah L.' },
            { role: 'Project Manager, General Contractor', feedback: 'Won 3 additional projects last month thanks to faster bid turnaround.', name: 'Michael R.' }
          ].map((testimonial, idx) => (
            <Grid item xs={12} md={4} key={idx}>
              <Paper
                elevation={0}
                sx={{
                  p: 3.5,
                  bgcolor: 'white',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: 3,
                  height: '100%'
                }}
              >
                <Typography variant="body1" sx={{ mb: 2.5, fontStyle: 'italic', color: '#1a1a1a', lineHeight: 1.7 }}>
                  "{testimonial.feedback}"
                </Typography>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      fontWeight: 700
                    }}
                  >
                    {testimonial.name[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
                      {testimonial.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      {testimonial.role}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          py: { xs: 8, md: 12 },
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 2 }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: 3,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3
            }}
          >
            <AutoAwesome sx={{ fontSize: 40, color: 'white' }} />
          </Box>
          <Typography variant="h2" sx={{ fontWeight: 800, mb: 2, color: 'white', fontSize: { xs: '2rem', md: '2.75rem' } }}>
            Ready to Transform Your Workflow?
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)', mb: 4, fontWeight: 400 }}>
            Start with 2,000 free credits. No credit card required. Cancel anytime.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/app/signup')}
            endIcon={<ArrowForward />}
            sx={{
              bgcolor: 'white',
              color: '#6366f1',
              px: 6,
              py: 2,
              fontSize: '1.2rem',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
              '&:hover': {
                bgcolor: '#f9fafb',
                boxShadow: '0 16px 48px rgba(0,0,0,0.3)'
              }
            }}
          >
            Start Your Free Trial
          </Button>
          <Stack direction="row" spacing={3} justifyContent="center" sx={{ mt: 4 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Verified sx={{ fontSize: 18, color: 'rgba(255,255,255,0.9)' }} />
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
                2-minute setup
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Verified sx={{ fontSize: 18, color: 'rgba(255,255,255,0.9)' }} />
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
                No credit card
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Verified sx={{ fontSize: 18, color: 'rgba(255,255,255,0.9)' }} />
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
                Cancel anytime
              </Typography>
            </Stack>
          </Stack>
        </Container>

        {/* Decorative elements */}
        <Box
          sx={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -100,
            left: -100,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}
        />
      </Box>

      {/* Footer */}
      <Box sx={{ py: 8, borderTop: '1px solid rgba(0,0,0,0.08)', bgcolor: '#fafafa' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <AutoAwesome sx={{ color: 'white', fontSize: 20 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
                  SkyBuild Pro
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.7 }}>
                AI-powered construction takeoff for modern estimators and quantity surveyors.
              </Typography>
            </Grid>
            <Grid item xs={12} md={8}>
              <Grid container spacing={3}>
                {[
                  { title: 'Product', links: ['Features', 'Pricing', 'Demo', 'API'] },
                  { title: 'Resources', links: ['Documentation', 'Support', 'Blog', 'Status'] },
                  { title: 'Company', links: ['About', 'Contact', 'Privacy', 'Terms'] }
                ].map((column, idx) => (
                  <Grid item xs={4} key={idx}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: '#1a1a1a' }}>
                      {column.title}
                    </Typography>
                    <Stack spacing={1}>
                      {column.links.map((link, linkIdx) => (
                        <Typography
                          key={linkIdx}
                          variant="body2"
                          sx={{
                            color: '#64748b',
                            cursor: 'pointer',
                            '&:hover': { color: '#6366f1' }
                          }}
                        >
                          {link}
                        </Typography>
                      ))}
                    </Stack>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
          <Box sx={{ mt: 6, pt: 4, borderTop: '1px solid rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              © {new Date().getFullYear()} SkyBuild Pro. Built with AI for construction professionals.
            </Typography>
          </Box>
        </Container>
      </Box>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </Box>
  )
}
