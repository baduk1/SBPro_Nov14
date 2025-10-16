import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CssBaseline } from '@mui/material'

import Landing from './pages/Landing'
import Shell from './App'
import Dashboard from './pages/Dashboard'
import SignIn from './pages/SignIn'
import Upload from './pages/Upload'
import JobStatus from './pages/JobStatus'
import TakeoffPreview from './pages/TakeoffPreview'

// New pages
import SuppliersList from './pages/Suppliers/SuppliersList'
import SupplierDetails from './pages/Suppliers/SupplierDetails'
import SupplierCreate from './pages/Suppliers/SupplierCreate'
import TemplatesList from './pages/Templates/TemplatesList'
import TemplateDetails from './pages/Templates/TemplateDetails'
import EstimatesList from './pages/Estimates/EstimatesList'
import EstimateDetails from './pages/Estimates/EstimateDetails'
import ProjectHistory from './pages/Projects/ProjectHistory'

import { ColorModeProvider } from './hooks/useColorMode'

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  {
    path: '/app',
    element: <Shell />,
    children: [
      { path: '', element: <Navigate to="dashboard" /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'signin', element: <SignIn /> },
      { path: 'upload', element: <Upload /> },
      { path: 'jobs/:id', element: <JobStatus /> },
      { path: 'jobs/:id/takeoff', element: <TakeoffPreview /> },

      // Suppliers
      { path: 'suppliers', element: <SuppliersList /> },
      { path: 'suppliers/new', element: <SupplierCreate /> },
      { path: 'suppliers/:id', element: <SupplierDetails /> },

      // Templates
      { path: 'templates', element: <TemplatesList /> },
      { path: 'templates/:id', element: <TemplateDetails /> },

      // Estimates
      { path: 'estimates', element: <EstimatesList /> },
      { path: 'estimates/:id', element: <EstimateDetails /> },

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
