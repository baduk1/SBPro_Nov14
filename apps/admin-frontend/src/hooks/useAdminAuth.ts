import { useCallback, useState } from 'react'
import api from '../services/api'

export type AdminProfile = {
  id: string
  email: string
  role: 'admin' | 'user'
}

export function useAdminAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<AdminProfile | null>(null)

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = new URLSearchParams()
      data.append('username', email)
      data.append('password', password)
      const res = await api.post('/auth/login', data, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      localStorage.setItem('token', res.data.access_token)
      const me = await api.get<AdminProfile>('/auth/me')
      if (me.data.role !== 'admin') {
        throw new Error('Admin role required')
      }
      setProfile(me.data)
      return true
    } catch (e: any) {
      localStorage.removeItem('token')
      setError(e?.response?.data?.detail || e?.message || 'Login failed')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const loadProfile = useCallback(async () => {
    try {
      const me = await api.get<AdminProfile>('/auth/me')
      if (me.data.role !== 'admin') {
        throw new Error('Admin role required')
      }
      setProfile(me.data)
      return true
    } catch {
      localStorage.removeItem('token')
      setProfile(null)
      return false
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    window.location.href = '/signin'
  }, [])

  return { login, loadProfile, logout, loading, error, profile }
}
