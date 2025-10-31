/**
 * WebSocket Service using Socket.IO
 *
 * Provides real-time communication for:
 * - BoQ item updates
 * - Task updates
 * - Comments and notifications
 * - User presence
 */

import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8000';

export interface BoqUpdateEvent {
  project_id: string;
  item_id: string;
  updates: Record<string, any>;
  updated_by: string;
}

export interface BoqBulkUpdateEvent {
  project_id: string;
  summary: {
    total: number;
    updated: number;
    skipped: number;
  };
  updated_by: string;
}

export interface TaskUpdateEvent {
  project_id: string;
  task_id: number;
  updates: Record<string, any>;
  updated_by: string;
}

export interface CommentCreatedEvent {
  project_id: string;
  comment_id: number;
  comment: Record<string, any>;
}

export interface NotificationEvent {
  id?: number;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  [key: string]: any;
}

export interface UserPresenceEvent {
  user_id: string;
  project_id: string;
}

export interface ConnectedEvent {
  user_id: string;
  message: string;
}

export interface ErrorEvent {
  message: string;
  [key: string]: any;
}

class WebSocketService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private currentProjectId: string | null = null;

  /**
   * Initialize and connect to WebSocket server
   */
  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.token = token;

      // Create socket connection
      this.socket = io(WS_URL, {
        path: '/socket.io',
        auth: {
          token: token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      // Connection success
      this.socket.on('connected', (data: ConnectedEvent) => {
        console.log('[WebSocket] Connected:', data);
        this.reconnectAttempts = 0;
        resolve();
      });

      // Connection error
      this.socket.on('connect_error', (error) => {
        console.error('[WebSocket] Connection error:', error.message);

        if (error.message === 'Authentication required' || error.message === 'Authentication failed') {
          // Token invalid - disconnect and notify
          this.disconnect();
          reject(new Error('WebSocket authentication failed'));
        } else {
          this.reconnectAttempts++;
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(new Error('WebSocket connection failed after multiple attempts'));
          }
        }
      });

      // Disconnection
      this.socket.on('disconnect', (reason) => {
        console.log('[WebSocket] Disconnected:', reason);

        if (reason === 'io server disconnect') {
          // Server disconnected - try to reconnect manually
          this.socket?.connect();
        }
      });

      // General error handler
      this.socket.on('error', (data: ErrorEvent) => {
        console.error('[WebSocket] Error:', data);
      });

      // Reconnection attempt
      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`[WebSocket] Reconnection attempt ${attemptNumber}...`);
      });

      // Reconnection success
      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`[WebSocket] Reconnected after ${attemptNumber} attempts`);
        this.reconnectAttempts = 0;

        // Rejoin project room if we were in one
        if (this.currentProjectId) {
          this.joinProject(this.currentProjectId);
        }
      });
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentProjectId = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Join a project room to receive real-time updates
   */
  joinProject(projectId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      this.currentProjectId = projectId;

      // Listen for success
      const onJoined = (data: any) => {
        console.log('[WebSocket] Joined project:', data);
        this.socket?.off('joined_project', onJoined);
        this.socket?.off('error', onError);
        resolve();
      };

      // Listen for error
      const onError = (data: ErrorEvent) => {
        if (data.message?.includes('Access denied')) {
          this.socket?.off('joined_project', onJoined);
          this.socket?.off('error', onError);
          reject(new Error(data.message));
        }
      };

      this.socket.once('joined_project', onJoined);
      this.socket.on('error', onError);

      // Emit join request
      this.socket.emit('join_project', { project_id: projectId });

      // Timeout after 10 seconds
      setTimeout(() => {
        this.socket?.off('joined_project', onJoined);
        this.socket?.off('error', onError);
        reject(new Error('Join project timeout'));
      }, 10000);
    });
  }

  /**
   * Leave a project room
   */
  leaveProject(projectId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave_project', { project_id: projectId });
      if (this.currentProjectId === projectId) {
        this.currentProjectId = null;
      }
    }
  }

  /**
   * Subscribe to BoQ item updates
   */
  onBoqUpdate(callback: (data: BoqUpdateEvent) => void) {
    this.socket?.on('boq:item:updated', callback);
    return () => {
      this.socket?.off('boq:item:updated', callback);
    };
  }

  /**
   * Subscribe to bulk BoQ updates
   */
  onBoqBulkUpdate(callback: (data: BoqBulkUpdateEvent) => void) {
    this.socket?.on('boq:bulk:updated', callback);
    return () => {
      this.socket?.off('boq:bulk:updated', callback);
    };
  }

  /**
   * Subscribe to task updates
   */
  onTaskUpdate(callback: (data: TaskUpdateEvent) => void) {
    this.socket?.on('task:updated', callback);
    return () => {
      this.socket?.off('task:updated', callback);
    };
  }

  /**
   * Subscribe to new comments
   */
  onCommentCreated(callback: (data: CommentCreatedEvent) => void) {
    this.socket?.on('comment:created', callback);
    return () => {
      this.socket?.off('comment:created', callback);
    };
  }

  /**
   * Subscribe to notifications
   */
  onNotification(callback: (data: NotificationEvent) => void) {
    this.socket?.on('notification:new', callback);
    return () => {
      this.socket?.off('notification:new', callback);
    };
  }

  /**
   * Subscribe to user joined events
   */
  onUserJoined(callback: (data: UserPresenceEvent) => void) {
    this.socket?.on('user:joined', callback);
    return () => this.socket?.off('user:joined', callback);
  }

  /**
   * Subscribe to user left events
   */
  onUserLeft(callback: (data: UserPresenceEvent) => void) {
    this.socket?.on('user:left', callback);
    return () => this.socket?.off('user:left', callback);
  }

  /**
   * Send ping to keep connection alive
   */
  ping() {
    if (this.socket?.connected) {
      this.socket.emit('ping', { timestamp: Date.now() });
    }
  }

  /**
   * Get current project ID
   */
  getCurrentProjectId(): string | null {
    return this.currentProjectId;
  }
}

// Singleton instance
export const websocketService = new WebSocketService();
