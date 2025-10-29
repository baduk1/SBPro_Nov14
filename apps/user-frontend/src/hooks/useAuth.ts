import { useState } from 'react'
import api from '../services/api'

export function useAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function login(email: string, password: string) {
    setLoading(true)
    setError(null)

    const data = new URLSearchParams()
    data.append('username', email)
    data.append('password', password)

    try {
      const res = await api.post('/auth/login', data, {
        headers: {'Content-Type':'application/x-www-form-urlencoded'}
      })
      localStorage.setItem('token', res.data.access_token)
      setLoading(false)
      return true
    } catch (e: any) {
      // Detailed error logging
      console.error('Login error:', e)
      console.error('Error response:', e?.response)
      console.error('Error data:', e?.response?.data)
      
      let errorMessage = 'Login failed'
      
      if (e?.response?.data?.detail) {
        // Backend returned specific error
        errorMessage = e.response.data.detail
      } else if (e?.response?.status === 400) {
        errorMessage = '❌ Incorrect email or password. Please try again.'
      } else if (e?.response?.status === 403) {
        errorMessage = '🔒 Email not verified. Please check your inbox for the verification link.'
      } else if (e?.response?.status === 404) {
        errorMessage = '❌ Account not found. Please check your email or sign up.'
      } else if (e?.response?.status === 500) {
        errorMessage = '⚠️ Server error. Please try again later or contact support.'
      } else if (e?.message === 'Network Error' || !e?.response) {
        errorMessage = '❌ Cannot connect to server. Please check your internet connection or try again later.'
      } else if (e?.code === 'ECONNABORTED') {
        errorMessage = '⏱️ Request timeout. Please check your connection and try again.'
      }
      
      setError(errorMessage)
      setLoading(false)
      return false
    }
  }

  function logout() {
    localStorage.removeItem('token')
    window.location.href = '/app/signin'
  }

  return { login, logout, loading, error }
}
