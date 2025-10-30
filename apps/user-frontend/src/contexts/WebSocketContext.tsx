/**
 * WebSocket Context Provider
 *
 * Provides WebSocket connection management and real-time event handling
 * to all components in the application.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  websocketService,
  BoqUpdateEvent,
  BoqBulkUpdateEvent,
  TaskUpdateEvent,
  CommentCreatedEvent,
  NotificationEvent,
  UserPresenceEvent,
} from '../services/websocket';

interface WebSocketContextValue {
  isConnected: boolean;
  currentProjectId: string | null;
  error: string | null;
  joinProject: (projectId: string) => Promise<void>;
  leaveProject: (projectId: string) => void;
  onlineUsers: Set<string>;
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

interface WebSocketProviderProps {
  children: React.ReactNode;
  token?: string; // JWT token for authentication
  autoConnect?: boolean; // Auto-connect on mount
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  token,
  autoConnect = true,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const connectionAttempted = useRef(false);

  // Connect to WebSocket when token is available
  useEffect(() => {
    if (!token || !autoConnect || connectionAttempted.current) {
      return;
    }

    connectionAttempted.current = true;

    const connect = async () => {
      try {
        await websocketService.connect(token);
        setIsConnected(true);
        setError(null);
      } catch (err) {
        console.error('[WebSocketProvider] Connection failed:', err);
        setError(err instanceof Error ? err.message : 'Connection failed');
        setIsConnected(false);
      }
    };

    connect();

    // Cleanup on unmount
    return () => {
      websocketService.disconnect();
      setIsConnected(false);
      connectionAttempted.current = false;
    };
  }, [token, autoConnect]);

  // Track user presence
  useEffect(() => {
    if (!isConnected) return;

    const handleUserJoined = (data: UserPresenceEvent) => {
      setOnlineUsers((prev) => new Set(prev).add(data.user_id));
    };

    const handleUserLeft = (data: UserPresenceEvent) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(data.user_id);
        return next;
      });
    };

    const unsubJoined = websocketService.onUserJoined(handleUserJoined);
    const unsubLeft = websocketService.onUserLeft(handleUserLeft);

    return () => {
      unsubJoined();
      unsubLeft();
    };
  }, [isConnected]);

  // Join project room
  const joinProject = useCallback(async (projectId: string) => {
    try {
      await websocketService.joinProject(projectId);
      setCurrentProjectId(projectId);
      setOnlineUsers(new Set()); // Reset online users for new project
    } catch (err) {
      console.error('[WebSocketProvider] Failed to join project:', err);
      throw err;
    }
  }, []);

  // Leave project room
  const leaveProject = useCallback((projectId: string) => {
    websocketService.leaveProject(projectId);
    if (currentProjectId === projectId) {
      setCurrentProjectId(null);
      setOnlineUsers(new Set());
    }
  }, [currentProjectId]);

  const value: WebSocketContextValue = {
    isConnected,
    currentProjectId,
    error,
    joinProject,
    leaveProject,
    onlineUsers,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

/**
 * Hook to access WebSocket context
 */
export const useWebSocket = (): WebSocketContextValue => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

/**
 * Hook for BoQ item updates
 */
export const useBoqUpdates = (callback: (data: BoqUpdateEvent) => void) => {
  const { isConnected } = useWebSocket();

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = websocketService.onBoqUpdate(callback);
    return unsubscribe;
  }, [isConnected, callback]);
};

/**
 * Hook for bulk BoQ updates
 */
export const useBoqBulkUpdates = (callback: (data: BoqBulkUpdateEvent) => void) => {
  const { isConnected } = useWebSocket();

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = websocketService.onBoqBulkUpdate(callback);
    return unsubscribe;
  }, [isConnected, callback]);
};

/**
 * Hook for task updates
 */
export const useTaskUpdates = (callback: (data: TaskUpdateEvent) => void) => {
  const { isConnected } = useWebSocket();

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = websocketService.onTaskUpdate(callback);
    return unsubscribe;
  }, [isConnected, callback]);
};

/**
 * Hook for comment notifications
 */
export const useCommentNotifications = (callback: (data: CommentCreatedEvent) => void) => {
  const { isConnected } = useWebSocket();

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = websocketService.onCommentCreated(callback);
    return unsubscribe;
  }, [isConnected, callback]);
};

/**
 * Hook for general notifications
 */
export const useNotifications = (callback: (data: NotificationEvent) => void) => {
  const { isConnected } = useWebSocket();

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = websocketService.onNotification(callback);
    return unsubscribe;
  }, [isConnected, callback]);
};

/**
 * Hook for user presence (who's online in project)
 */
export const useUserPresence = () => {
  const { onlineUsers, isConnected } = useWebSocket();

  return {
    onlineUsers: Array.from(onlineUsers),
    onlineCount: onlineUsers.size,
    isConnected,
  };
};

/**
 * Hook to join/leave project rooms automatically
 */
export const useProjectRoom = (projectId: string | null) => {
  const { joinProject, leaveProject, isConnected } = useWebSocket();

  useEffect(() => {
    if (!projectId || !isConnected) return;

    // Join project room
    joinProject(projectId).catch((err) => {
      console.error('[useProjectRoom] Failed to join project:', err);
    });

    // Leave on unmount
    return () => {
      leaveProject(projectId);
    };
  }, [projectId, isConnected, joinProject, leaveProject]);
};
