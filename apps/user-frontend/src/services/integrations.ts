/**
 * Integrations API Service
 * Handles third-party integrations (Notion, etc.)
 */

import api from './api'

// ==================== Types ====================

export interface NotionStatus {
  connected: boolean
  integration_type: string
  workspace_name?: string
  workspace_id?: string
  connected_at?: string
  is_active: boolean
}

export interface NotionConnectionResponse {
  success: boolean
  workspace_name: string
  workspace_id: string
  bot_id: string
  message: string
}

export interface NotionExportRequest {
  job_id: string
  parent_page_id?: string
  include_charts?: boolean
  include_download_links?: boolean
}

export interface NotionExportResponse {
  success: boolean
  notion_page_id: string
  notion_page_url: string
  message: string
  items_exported: number
}

export interface IntegrationDisconnectResponse {
  success: boolean
  message: string
  integration_type: string
}

// ==================== Notion Integration API ====================

export const integrationsAPI = {
  // ===== Notion Status =====

  /**
   * Check if user has connected Notion integration
   */
  getNotionStatus: async (): Promise<NotionStatus> => {
    const res = await api.get<NotionStatus>('/integrations/notion/status')
    return res.data
  },

  // ===== Notion OAuth =====

  /**
   * Start Notion OAuth flow
   * Redirects user to Notion authorization page
   */
  startNotionOAuth: () => {
    // Get config from environment or use defaults
    const clientId = import.meta.env.VITE_NOTION_CLIENT_ID || ''
    const redirectUri = encodeURIComponent(
      `${window.location.origin}/app/integrations/notion/callback`
    )

    if (!clientId) {
      console.error('VITE_NOTION_CLIENT_ID not configured')
      throw new Error('Notion client ID not configured')
    }

    // Construct Notion OAuth URL
    const authUrl =
      `https://api.notion.com/v1/oauth/authorize?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `owner=user&` +
      `redirect_uri=${redirectUri}`

    // Redirect to Notion
    window.location.href = authUrl
  },

  /**
   * Complete Notion OAuth connection
   * Called from callback page with authorization code
   */
  connectNotion: async (code: string): Promise<NotionConnectionResponse> => {
    const res = await api.post<NotionConnectionResponse>(
      '/integrations/notion/connect',
      { code }
    )
    return res.data
  },

  // ===== Notion Disconnect =====

  /**
   * Disconnect Notion integration
   */
  disconnectNotion: async (): Promise<IntegrationDisconnectResponse> => {
    const res = await api.post<IntegrationDisconnectResponse>(
      '/integrations/notion/disconnect'
    )
    return res.data
  },

  // ===== Notion Export =====

  /**
   * Export BoQ to Notion
   */
  exportToNotion: async (
    request: NotionExportRequest
  ): Promise<NotionExportResponse> => {
    const res = await api.post<NotionExportResponse>(
      '/integrations/notion/export',
      request
    )
    return res.data
  },
}

export default integrationsAPI
