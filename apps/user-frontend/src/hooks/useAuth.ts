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
      setError(e?.response?.data?.detail || 'Login failed')
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
