import axios, { InternalAxiosRequestConfig } from 'axios'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Auto-redirect to sign-in on authentication errors
    if (err?.response?.status === 401) {
      localStorage.removeItem('token')
      // Show brief message before redirect
      alert('Session expired. Please sign in again.')
      window.location.href = '/signin'
    }
    return Promise.reject(err)
  }
)

export default api
