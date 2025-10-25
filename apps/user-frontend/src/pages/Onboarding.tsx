import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Step,
  StepLabel,
  Stepper,
  Typography,
  Stack,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  LinearProgress,
  Chip,
  Grid
} from '@mui/material'
import {
  CloudUpload as UploadIcon,
  CheckCircle as CheckIcon,
  Business as SupplierIcon,
  Description as TemplateIcon,
  Receipt as EstimateIcon,
  Dashboard as DashboardIcon,
  PlayArrow as PlayIcon,
  AutoAwesome as AutoIcon
} from '@mui/icons-material'

const steps = ['Welcome', 'Quick Demo', 'Get Started']

export default function Onboarding() {
  const navigate = useNavigate()
  const [activeStep, setActiveStep] = useState(0)

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      // Complete onboarding
      localStorage.setItem('onboarding_complete', 'true')
      navigate('/app/dashboard')
    } else {
      setActiveStep((prevStep) => prevStep + 1)
    }
  }

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1)
  }

  const handleSkip = () => {
    localStorage.setItem('onboarding_complete', 'true')
    navigate('/app/dashboard')
  }

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h3" sx={{ color: 'white', fontWeight: 700, mb: 1 }}>
            Welcome to SkyBuild Pro
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)' }}>
            Let's get you started in 3 simple steps
          </Typography>
        </Box>

        {/* Stepper Card */}
        <Paper elevation={8} sx={{ p: 4, mb: 3, borderRadius: 2 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Step Content */}
          <Box sx={{ minHeight: 400 }}>
            {activeStep === 0 && <WelcomeStep />}
            {activeStep === 1 && <DemoStep />}
            {activeStep === 2 && <GetStartedStep />}
          </Box>

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              onClick={handleSkip}
              color="inherit"
              sx={{ textTransform: 'none' }}
            >
              Skip Tutorial
            </Button>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
                sx={{ textTransform: 'none' }}
              >
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleNext}
                size="large"
                sx={{ textTransform: 'none', px: 4 }}
              >
                {activeStep === steps.length - 1 ? 'Start Using SkyBuild' : 'Next'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}

// Step 1: Welcome
function WelcomeStep() {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, textAlign: 'center', fontWeight: 600 }}>
        🎉 Welcome to SkyBuild Pro!
      </Typography>
      <Typography variant="body1" sx={{ mb: 4, textAlign: 'center', color: 'text.secondary', maxWidth: 700, mx: 'auto' }}>
        SkyBuild Pro is your intelligent assistant for construction cost estimation.
        Upload drawings, extract BoQs, manage suppliers, and create accurate estimates in minutes.
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <UploadIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Typography variant="h6" fontWeight={600}>
                  Upload & Extract
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Upload DWG/PDF drawings and automatically extract Bills of Quantities (BoQ) using AI-powered processing.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SupplierIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Typography variant="h6" fontWeight={600}>
                  Manage Suppliers
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Add suppliers, manage price lists, and import pricing from CSV. Keep all your supplier data organized.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TemplateIcon sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Typography variant="h6" fontWeight={600}>
                  Create Templates
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Build reusable BoQ templates for common project types. Apply templates to new jobs instantly.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EstimateIcon sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
                <Typography variant="h6" fontWeight={600}>
                  Generate Estimates
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Create detailed cost estimates with adjustments (markup, discounts, taxes). Export to PDF/Excel.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mt: 4 }}>
        <Typography variant="body2">
          <strong>Pro Tip:</strong> You start with 2000 free credits. Each file upload costs credits based on file size and complexity.
        </Typography>
      </Alert>
    </Box>
  )
}

// Step 2: Quick Demo
function DemoStep() {
  const [demoProgress, setDemoProgress] = useState(0)
  const [demoComplete, setDemoComplete] = useState(false)

  const startDemo = () => {
    setDemoProgress(10)
    const interval = setInterval(() => {
      setDemoProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setDemoComplete(true)
          return 100
        }
        return prev + 10
      })
    }, 300)
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, textAlign: 'center', fontWeight: 600 }}>
        📋 See How It Works
      </Typography>
      <Typography variant="body1" sx={{ mb: 4, textAlign: 'center', color: 'text.secondary', maxWidth: 700, mx: 'auto' }}>
        Watch a quick demonstration of the typical workflow in SkyBuild Pro
      </Typography>

      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        {!demoComplete ? (
          <>
            <Card variant="outlined" sx={{ p: 4, textAlign: 'center', mb: 3 }}>
              <AutoIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Interactive Demo Workflow
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                See the complete process from file upload to estimate generation
              </Typography>

              {demoProgress > 0 ? (
                <Box sx={{ width: '100%', mt: 3 }}>
                  <LinearProgress variant="determinate" value={demoProgress} sx={{ height: 8, borderRadius: 4 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Processing demo... {demoProgress}%
                  </Typography>
                </Box>
              ) : (
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayIcon />}
                  onClick={startDemo}
                  sx={{ textTransform: 'none', px: 4 }}
                >
                  Start Demo
                </Button>
              )}
            </Card>

            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                Demo Workflow Steps:
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Chip label="1" size="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Upload Drawing File"
                    secondary="Upload a DWG or PDF file with construction drawings"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Chip label="2" size="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="AI Extraction"
                    secondary="System automatically extracts BoQ items from drawings"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Chip label="3" size="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Review & Edit"
                    secondary="Review extracted items, add/edit/remove as needed"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Chip label="4" size="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Apply Pricing"
                    secondary="Use supplier pricing or templates to calculate costs"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Chip label="5" size="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Generate Estimate"
                    secondary="Create detailed estimate with adjustments and export"
                  />
                </ListItem>
              </List>
            </Paper>
          </>
        ) : (
          <Card sx={{ p: 4, textAlign: 'center', bgcolor: 'success.main', color: 'white' }}>
            <CheckIcon sx={{ fontSize: 80, mb: 2 }} />
            <Typography variant="h5" gutterBottom fontWeight={600}>
              Demo Complete!
            </Typography>
            <Typography variant="body1">
              You now understand the core workflow. Ready to get started with your first project?
            </Typography>
          </Card>
        )}
      </Box>
    </Box>
  )
}

// Step 3: Get Started
function GetStartedStep() {
  const navigate = useNavigate()

  const quickActions = [
    {
      title: 'Upload Your First Drawing',
      description: 'Start by uploading a DWG or PDF file to extract BoQ',
      icon: <UploadIcon sx={{ fontSize: 40 }} />,
      color: 'primary.main',
      action: () => {
        localStorage.setItem('onboarding_complete', 'true')
        navigate('/app/upload')
      }
    },
    {
      title: 'Add Suppliers',
      description: 'Set up your supplier database with pricing information',
      icon: <SupplierIcon sx={{ fontSize: 40 }} />,
      color: 'success.main',
      action: () => {
        localStorage.setItem('onboarding_complete', 'true')
        navigate('/app/suppliers')
      }
    },
    {
      title: 'Create a Template',
      description: 'Build reusable BoQ templates for common project types',
      icon: <TemplateIcon sx={{ fontSize: 40 }} />,
      color: 'warning.main',
      action: () => {
        localStorage.setItem('onboarding_complete', 'true')
        navigate('/app/templates')
      }
    },
    {
      title: 'Go to Dashboard',
      description: 'Explore the dashboard and familiarize yourself with features',
      icon: <DashboardIcon sx={{ fontSize: 40 }} />,
      color: 'info.main',
      action: () => {
        localStorage.setItem('onboarding_complete', 'true')
        navigate('/app/dashboard')
      }
    }
  ]

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, textAlign: 'center', fontWeight: 600 }}>
        🚀 Ready to Get Started?
      </Typography>
      <Typography variant="body1" sx={{ mb: 4, textAlign: 'center', color: 'text.secondary', maxWidth: 700, mx: 'auto' }}>
        Choose where you'd like to begin. You can always explore other features from the dashboard.
      </Typography>

      <Grid container spacing={3}>
        {quickActions.map((action, index) => (
          <Grid item xs={12} sm={6} key={index}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                  borderColor: action.color
                }
              }}
              onClick={action.action}
            >
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Box sx={{ color: action.color, mb: 2 }}>
                  {action.icon}
                </Box>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  {action.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {action.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Alert severity="success" sx={{ mt: 4 }}>
        <Typography variant="body2">
          <strong>💡 Need help?</strong> Check the dashboard for quick tips and access to documentation.
          You can revisit this tutorial anytime from settings.
        </Typography>
      </Alert>
    </Box>
  )
}
