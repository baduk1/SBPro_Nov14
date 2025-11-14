import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'

import LandingNew from './pages/LandingNew'
import Shell from './App'
import Dashboard from './pages/DashboardNew'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import VerifyEmail from './pages/VerifyEmail'
import Onboarding from './pages/Onboarding'
import NotionCallback from './pages/NotionCallback'
import Upload from './pages/Upload'
import JobStatus from './pages/JobStatus'
import TakeoffPreview from './pages/TakeoffPreview'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'

// New pages
import SuppliersList from './pages/Suppliers/SuppliersList'
import SupplierDetails from './pages/Suppliers/SupplierDetails'
import SupplierCreate from './pages/Suppliers/SupplierCreate'
import TemplatesListNew from './pages/Templates/TemplatesListNew'
import TemplateDetailsNew from './pages/Templates/TemplateDetailsNew'
import EstimatesListNew from './pages/Estimates/EstimatesListNew'
import EstimateDetailsNew from './pages/Estimates/EstimateDetailsNew'
import ProjectHistory from './pages/Projects/ProjectHistory'
import ProjectCollaboration from './pages/Projects/ProjectCollaboration'
import ProjectTasks from './pages/Projects/ProjectTasks'
import ProjectKanban from './pages/Projects/ProjectKanban'
import ProjectTimeline from './pages/Projects/ProjectTimeline'
import ProjectOverview from './pages/Projects/ProjectOverview'
import ProjectBoQ from './pages/Projects/ProjectBoQ'
import BoQEditor from './pages/Jobs/BoQEditor'

// Layouts and Components
import ProjectLayout from './layouts/ProjectLayout'
import LegacyJobRedirect from './components/LegacyJobRedirect'

import { ColorModeProvider } from './hooks/useColorMode'
import { WebSocketProvider } from './contexts/WebSocketContext'

// ✅ Light theme for public pages (landing, verify-email, onboarding)
const lightTheme = createTheme({
  palette: { mode: 'light' },
  typography: {
    fontFamily: '"IBM Plex Sans", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
})

// Wrapper for public routes (always light theme)
function PublicLayout() {
  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <Outlet />
    </ThemeProvider>
  )
}

// Wrapper for app routes (with dark mode toggle and WebSocket)
function AppLayout() {
  const token = localStorage.getItem('token') || undefined

  return (
    <ColorModeProvider>
      <WebSocketProvider token={token} autoConnect={!!token}>
        <CssBaseline />
        <Outlet />
      </WebSocketProvider>
    </ColorModeProvider>
  )
}

const router = createBrowserRouter([
  {
    // ✅ Public routes - always light theme
    element: <PublicLayout />,
    children: [
      { path: '/', element: <LandingNew /> },
      { path: '/verify-email', element: <VerifyEmail /> },
      { path: '/onboarding', element: <Onboarding /> },
      { path: '/privacy', element: <Privacy /> },
      { path: '/terms', element: <Terms /> },
    ],
  },
  {
    // ✅ App routes - with dark mode toggle
    path: '/app',
    element: <AppLayout />,
    children: [
      {
        element: <Shell />,
        children: [
          { path: '', element: <Navigate to="dashboard" /> },
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'signin', element: <SignIn /> },
          { path: 'signup', element: <SignUp /> },
          { path: 'upload', element: <Upload /> },
          { path: 'jobs/:id', element: <JobStatus /> },

          // Integrations
          { path: 'integrations/notion/callback', element: <NotionCallback /> },

          // Legacy redirects - redirect old job URLs to new project URLs
          { path: 'jobs/:id/takeoff', element: <LegacyJobRedirect /> },
          { path: 'jobs/:id/boq', element: <LegacyJobRedirect /> },

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

          // Projects - wrapped in ProjectLayout
          {
            path: 'projects/:id',
            element: <ProjectLayout />,
            children: [
              { path: 'overview', element: <ProjectOverview /> },
              { path: 'upload', element: <Upload /> },
              { path: 'boq', element: <ProjectBoQ /> },
              { path: 'estimates', element: <EstimatesListNew /> },
              { path: 'estimates/:estimateId', element: <EstimateDetailsNew /> },
              { path: 'team', element: <ProjectCollaboration /> },
              { path: 'tasks', element: <ProjectTasks /> },
              { path: 'kanban', element: <ProjectKanban /> },
              { path: 'timeline', element: <ProjectTimeline /> },
              { path: 'history', element: <ProjectHistory /> },
              { path: 'files', element: <div>Files placeholder</div> },
              { path: 'settings', element: <div>Settings placeholder</div> },
            ],
          },
        ],
      },
    ],
  },
])

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
)
