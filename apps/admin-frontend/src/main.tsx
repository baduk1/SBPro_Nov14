import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CssBaseline } from '@mui/material'

import Shell from './App'
import { ColorModeProvider } from './hooks/useColorMode'
import SignIn from './pages/SignIn'
import AdminDashboard from './pages/AdminDashboard'
import AdminAccessRequests from './pages/AdminAccessRequests'
import AdminPriceLists from './pages/AdminPriceLists'
import AdminMappings from './pages/AdminMappings'
import AdminGuard from './components/AdminGuard'

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" /> },
  { path: '/signin', element: <SignIn /> },
  {
    path: '/',
    element: <Shell />,
    children: [
      { path: 'dashboard', element: <AdminGuard><AdminDashboard /></AdminGuard> },
      { path: 'access-requests', element: <AdminGuard><AdminAccessRequests /></AdminGuard> },
      { path: 'price-lists', element: <AdminGuard><AdminPriceLists /></AdminGuard> },
      { path: 'mappings', element: <AdminGuard><AdminMappings /></AdminGuard> },
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
