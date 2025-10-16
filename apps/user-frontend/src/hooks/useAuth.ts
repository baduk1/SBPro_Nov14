import { useState } from 'react'
import api from '../services/api'

export function useAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function login(email: string, password: string) {
    setLoading(true); setError(null)

    // TEMPORARY: Mock authentication for UI testing
    if (email === 'demo@skybuild.com' || email === 'test') {
      localStorage.setItem('token', 'mock-token-for-ui-testing')
      setLoading(false)
      return true
    }

    const data = new URLSearchParams()
    data.append('username', email)
    data.append('password', password)
    try {
      const res = await api.post('/auth/login', data, { headers: {'Content-Type':'application/x-www-form-urlencoded'} })
      localStorage.setItem('token', res.data.access_token)
      return true
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Login failed')
      return false
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('token')
    window.location.href = '/app/signin'
  }

  return { login, logout, loading, error }
}
