/**
 * usePresence Hook
 *
 * Manages user presence in a project by combining:
 * - Project collaborators list (from API)
 * - Online user IDs (from WebSocket events)
 *
 * Returns online users with full details (name, avatar, role).
 */

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { io, Socket } from 'socket.io-client'
import api from '../services/api'

interface CollaboratorUser {
  id: string
  user_id: string
  user_name: string
  user_email: string
  role: 'owner' | 'editor' | 'viewer'
  avatar_url?: string
}

interface PresenceUser {
  id: string
  full_name: string
  email: string
  role: 'owner' | 'editor' | 'viewer'
  avatar_url?: string
  online: boolean
}

export function usePresence(projectId: string) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())
  const [socket, setSocket] = useState<Socket | null>(null)

  // Fetch project collaborators
  const { data: collaborators = [] } = useQuery<CollaboratorUser[]>({
    queryKey: ['collaborators', projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}/collaborators`)
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!projectId
  })

  // Connect to WebSocket and subscribe to presence events
  useEffect(() => {
    if (!projectId) return

    // Get token from localStorage
    const token = localStorage.getItem('token')
    if (!token) return

    // Connect to WebSocket
    const socketInstance = io('http://localhost:8000', {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling']
    })

    socketInstance.on('connect', () => {
      console.log('[usePresence] Connected to WebSocket')
      // Join project room
      socketInstance.emit('join_project', { project_id: projectId })
    })

    socketInstance.on('joined_project', (data) => {
      console.log('[usePresence] Joined project room:', data)
    })

    socketInstance.on('user:joined', (data: { user_id: string; project_id: string }) => {
      console.log('[usePresence] User joined:', data)
      if (data.project_id === projectId) {
        setOnlineUserIds(prev => new Set(prev).add(data.user_id))
      }
    })

    socketInstance.on('user:left', (data: { user_id: string; project_id: string }) => {
      console.log('[usePresence] User left:', data)
      if (data.project_id === projectId) {
        setOnlineUserIds(prev => {
          const next = new Set(prev)
          next.delete(data.user_id)
          return next
        })
      }
    })

    socketInstance.on('disconnect', () => {
      console.log('[usePresence] Disconnected from WebSocket')
      setOnlineUserIds(new Set())
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.emit('leave_project', { project_id: projectId })
      socketInstance.disconnect()
    }
  }, [projectId])

  // Create collaborator lookup map for O(1) access
  // Performance: O(n_collaborators) once, then O(1) per lookup
  const collabById = useMemo(() => {
    const map = new Map<string, CollaboratorUser>()
    collaborators.forEach(collab => map.set(collab.user_id, collab))
    return map
  }, [collaborators])

  // Merge collaborators with online status
  // Performance: O(n_online) instead of O(n_collaborators)
  // Benefit: When 50 collaborators but only 3 online → 3 lookups instead of 50 iterations
  const onlineUsers = useMemo(() => {
    const users: PresenceUser[] = []

    // Iterate through online users (typically small set) and lookup in Map
    onlineUserIds.forEach(userId => {
      const collab = collabById.get(userId)
      if (collab) {
        users.push({
          id: collab.user_id,
          full_name: collab.user_name || collab.user_email,
          email: collab.user_email,
          role: collab.role,
          avatar_url: collab.avatar_url,
          online: true
        })
      }
    })

    return users
  }, [collabById, onlineUserIds])

  return {
    onlineUsers,
    totalOnline: onlineUsers.length,
    isConnected: socket?.connected || false
  }
}
