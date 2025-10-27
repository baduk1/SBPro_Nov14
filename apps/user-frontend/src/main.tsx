import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CssBaseline } from '@mui/material'

import LandingNew from './pages/LandingNew'
import LandingBCG from './pages/LandingBCG'
import LandingApplyAI from './pages/LandingApplyAI'
import Shell from './App'
import Dashboard from './pages/Dashboard'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import VerifyEmail from './pages/VerifyEmail'
import Onboarding from './pages/Onboarding'
import Upload from './pages/Upload'
import JobStatus from './pages/JobStatus'
import TakeoffPreview from './pages/TakeoffPreview'

// New pages
import SuppliersList from './pages/Suppliers/SuppliersList'
import SupplierDetails from './pages/Suppliers/SupplierDetails'
import SupplierCreate from './pages/Suppliers/SupplierCreate'
import TemplatesListNew from './pages/Templates/TemplatesListNew'
import TemplateDetailsNew from './pages/Templates/TemplateDetailsNew'
import EstimatesListNew from './pages/Estimates/EstimatesListNew'
import EstimateDetailsNew from './pages/Estimates/EstimateDetailsNew'
import ProjectHistory from './pages/Projects/ProjectHistory'

import { ColorModeProvider } from './hooks/useColorMode'

const router = createBrowserRouter([
  { path: '/', element: <LandingNew /> },
  { path: '/version_1', element: <LandingBCG /> },
  { path: '/version_2', element: <LandingApplyAI /> },
  { path: '/verify-email', element: <VerifyEmail /> },
  { path: '/onboarding', element: <Onboarding /> },
  {
    path: '/app',
    element: <Shell />,
    children: [
      { path: '', element: <Navigate to="dashboard" /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'signin', element: <SignIn /> },
      { path: 'signup', element: <SignUp /> },
      { path: 'upload', element: <Upload /> },
      { path: 'jobs/:id', element: <JobStatus /> },
      { path: 'jobs/:id/takeoff', element: <TakeoffPreview /> },

      // Suppliers
      { path: 'suppliers', element: <SuppliersList /> },
      { path: 'suppliers/new', element: <SupplierCreate /> },
      { path: 'suppliers/:id', element: <SupplierDetails /> },

      // Templates
      { path: 'templates', element: <TemplatesListNew /> },
      { path: 'templates/:id', element: <TemplateDetailsNew /> },

      // Estimates
      { path: 'estimates', element: <EstimatesListNew /> },
      { path: 'estimates/:id', element: <EstimateDetailsNew /> },

      // Projects
      { path: 'projects/:id/history', element: <ProjectHistory /> },
    ],
  },
])

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ColorModeProvider>
        <CssBaseline />
        <RouterProvider router={router} />
      </ColorModeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
