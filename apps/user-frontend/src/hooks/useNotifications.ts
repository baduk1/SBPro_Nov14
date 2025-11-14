/**
 * useNotifications Hook
 *
 * Manages user notifications with real-time updates.
 * Features:
 * - Fetch notifications with filters
 * - Mark as read (single/bulk)
 * - Real-time updates via WebSocket
 * - Unread count tracking
 */

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWebSocket } from '../contexts/WebSocketContext'
import api from '../services/api'

export interface Notification {
  id: string
  user_id: string
  project_id?: string
  type: 'mention' | 'invite' | 'task.assigned' | string
  payload: {
    actor_name?: string
    task_title?: string
    comment_body?: string
    project_name?: string
    [key: string]: any
  }
  created_at: string
  read_at?: string
}

interface UseNotificationsOptions {
  unreadOnly?: boolean
  limit?: number
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { unreadOnly = false, limit = 20 } = options
  const queryClient = useQueryClient()
  const { socket } = useWebSocket()

  const queryKey = ['notifications', { unreadOnly, limit }]

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey,
    queryFn: () =>
      api.get('/notifications', {
        params: {
          unread_only: unreadOnly,
          limit
        }
      }).then(r => r.data),
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true
  })

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: () =>
      api.post('/notifications/mark-read').then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  // Mark single notification as read
  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      api.post(`/notifications/${notificationId}/mark-read`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  // Subscribe to real-time notification events
  useEffect(() => {
    if (!socket) return

    const handleNotificationNew = (event: any) => {
      // Invalidate queries to fetch new notifications
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }

    // Listen for various events that might create notifications
    socket.on('notification:new', handleNotificationNew)
    socket.on('comment:created', handleNotificationNew) // Mentions
    socket.on('task:updated', handleNotificationNew) // Assignments

    return () => {
      socket.off('notification:new', handleNotificationNew)
      socket.off('comment:created', handleNotificationNew)
      socket.off('task:updated', handleNotificationNew)
    }
  }, [socket, queryClient])

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.read_at).length

  return {
    notifications,
    isLoading,
    unreadCount,
    markAllRead: markAllReadMutation.mutate,
    markRead: markReadMutation.mutate,
    isMarkingRead: markAllReadMutation.isPending || markReadMutation.isPending
  }
}
