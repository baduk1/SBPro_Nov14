import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CssBaseline, ThemeProvider } from '@mui/material'

import App from './pages/Landing'
import Shell from './App'
import Dashboard from './pages/Dashboard'
import SignIn from './pages/SignIn'
import Upload from './pages/Upload'
import JobStatus from './pages/JobStatus'
import TakeoffPreview from './pages/TakeoffPreview'
import MappingAllowances from './pages/MappingAllowances'
import BoQPreview from './pages/BoQPreview'
import ExportChooser from './pages/ExportChooser'
import AdminPriceLists from './pages/AdminPriceLists'
import AdminMappings from './pages/AdminMappings'
import AdminAccessRequests from './pages/AdminAccessRequests'
import theme from './theme'

const router = createBrowserRouter([
  { path: '/', element: <App /> },
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
      { path: 'jobs/:id/mapping', element: <MappingAllowances /> },
      { path: 'jobs/:id/boq', element: <BoQPreview /> },
      { path: 'jobs/:id/export', element: <ExportChooser /> },
      { path: 'admin/price-lists', element: <AdminPriceLists /> },
      { path: 'admin/mappings', element: <AdminMappings /> },
      { path: 'admin/access-requests', element: <AdminAccessRequests /> },
    ],
  },
])

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
