/**
 * useComments Hook
 *
 * Manages comments for a specific resource (task, boq, project).
 * Provides CRUD operations and real-time updates via WebSocket.
 */

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { io, Socket } from 'socket.io-client'
import api from '../services/api'

export interface Comment {
  id: number | string  // number for real comments, string for optimistic (e.g., 'tmp-123456789')
  project_id: string
  context_type: 'task' | 'boq' | 'project'
  context_id: string
  body: string
  author_id: string
  author: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
  }
  parent_id?: number
  created_at: string
  updated_at?: string
  replies?: Comment[]
  pending?: boolean  // Indicates optimistic comment awaiting server confirmation
}

interface CreateCommentPayload {
  body: string
  parent_id?: number
}

export function useComments(
  projectId: string,
  contextType: 'task' | 'boq' | 'project',
  contextId: string
) {
  const queryClient = useQueryClient()

  const queryKey = ['comments', projectId, contextType, contextId]

  // Fetch current user for optimistic updates
  const { data: currentUser } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.get('/auth/me').then(r => r.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Fetch comments
  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey,
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}/comments`, {
        params: {
          context_type: contextType,
          context_id: contextId
        }
      })
      return response.data
    },
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!projectId && !!contextType && !!contextId
  })

  // Create comment mutation with optimistic updates
  const createMutation = useMutation({
    mutationFn: async (payload: CreateCommentPayload) => {
      const response = await api.post(`/projects/${projectId}/comments`, {
        context_type: contextType,
        context_id: contextId,
        body: payload.body,
        parent_id: payload.parent_id
      })
      return response.data
    },
    // Optimistic update: show comment immediately before server responds
    onMutate: async (payload: CreateCommentPayload) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey })

      // Snapshot current comments for rollback on error
      const previousComments = queryClient.getQueryData<Comment[]>(queryKey) || []

      // Create optimistic comment with temporary ID
      const optimisticComment: Comment = {
        id: `tmp-${Date.now()}`, // Temporary ID (string)
        project_id: projectId,
        context_type: contextType,
        context_id: contextId,
        body: payload.body,
        author_id: currentUser?.id || 'unknown',
        author: {
          id: currentUser?.id || 'unknown',
          full_name: currentUser?.full_name || currentUser?.email || 'You',
          email: currentUser?.email || '',
          avatar_url: undefined
        },
        parent_id: payload.parent_id,
        created_at: new Date().toISOString(),
        pending: true // Flag for UI to show loading state
      }

      // Optimistically update query data
      queryClient.setQueryData<Comment[]>(queryKey, [optimisticComment, ...previousComments])

      // Return context for rollback
      return { previousComments }
    },
    // Rollback on error
    onError: (error, variables, context) => {
      console.error('[useComments] Comment creation failed:', error)
      if (context?.previousComments) {
        queryClient.setQueryData<Comment[]>(queryKey, context.previousComments)
      }
    },
    // Replace optimistic with real data on success
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    }
  })

  // Subscribe to real-time WebSocket updates
  // IMPORTANT: Each comment context (task, boq, project) maintains its own
  // query cache. We MUST scope invalidations to prevent unnecessary refetches
  // of unrelated comment threads within the same project.
  useEffect(() => {
    if (!projectId) return

    const token = localStorage.getItem('token')
    if (!token) return

    const socket: Socket = io('http://localhost:8000', {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling']
    })

    socket.on('connect', () => {
      console.log('[useComments] Connected to WebSocket')
      socket.emit('join_project', { project_id: projectId })
    })

    // Helper to check if event matches our context
    const isOurContext = (event: any): boolean => {
      return (
        event.project_id === projectId &&
        event.comment?.context_type === contextType &&
        event.comment?.context_id === contextId
      )
    }

    socket.on('comment:created', (event: any) => {
      console.log('[useComments] Comment created event:', event)
      // Only invalidate if comment belongs to THIS specific context
      // Prevents global refetch when other tasks/boqs receive comments
      if (isOurContext(event)) {
        queryClient.invalidateQueries({ queryKey })
      }
    })

    socket.on('comment:updated', (event: any) => {
      console.log('[useComments] Comment updated event:', event)
      // Scoped invalidation: only refetch if update is for our context
      if (isOurContext(event)) {
        queryClient.invalidateQueries({ queryKey })
      }
    })

    socket.on('comment:deleted', (event: any) => {
      console.log('[useComments] Comment deleted event:', event)
      // Scoped invalidation: only refetch if deletion is for our context
      if (isOurContext(event)) {
        queryClient.invalidateQueries({ queryKey })
      }
    })

    return () => {
      socket.emit('leave_project', { project_id: projectId })
      socket.disconnect()
    }
  }, [projectId, contextType, contextId, queryClient, queryKey])

  return {
    comments,
    isLoading,
    createComment: createMutation.mutate,
    isCreating: createMutation.isPending
  }
}
