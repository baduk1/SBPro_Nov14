/**
 * useProjectContext Hook
 *
 * Provides project data, loading state, error handling, and derived properties
 * (currency, locale, user role) for project-related components.
 *
 * Used by ProjectLayout and child components that need project context.
 */

import { useState, useEffect, useCallback } from 'react'
import { projects, Project } from '../services/api'

export type ProjectRole = 'owner' | 'editor' | 'viewer'

export interface UseProjectContextReturn {
  project: Project | null
  loading: boolean
  error: Error | null
  refetch: () => void
  currency: string
  locale: string
  role: ProjectRole
}

/**
 * Fetches and manages project data for the given projectId.
 *
 * @param projectId - The ID of the project to fetch
 * @returns Project data, loading state, error, refetch function, and derived properties
 *
 * @example
 * ```tsx
 * const { project, loading, error, currency, role } = useProjectContext(projectId)
 *
 * if (loading) return <CircularProgress />
 * if (error) return <Alert severity="error">Failed to load project</Alert>
 *
 * return <div>{project.name} ({currency})</div>
 * ```
 */
export function useProjectContext(projectId: string | null): UseProjectContextReturn {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchProject = useCallback(async () => {
    if (!projectId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await projects.get(projectId)
      setProject(data)
    } catch (err) {
      console.error('[useProjectContext] Failed to fetch project:', err)
      setError(err instanceof Error ? err : new Error('Failed to load project'))
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  const refetch = useCallback(() => {
    fetchProject()
  }, [fetchProject])

  // Derived properties with defaults
  const currency = project?.currency || 'GBP'
  const locale = project?.locale || 'en-GB'

  // TODO: Backend should provide user's role in the project
  // For now, hardcode as 'owner' until Phase 2 (Task 2.5) implements role checks
  const role: ProjectRole = 'owner'

  return {
    project,
    loading,
    error,
    refetch,
    currency,
    locale,
    role,
  }
}
