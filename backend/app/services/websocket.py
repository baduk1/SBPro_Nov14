"""
WebSocket Service using Socket.IO

Handles real-time communication for:
- BoQ item updates
- Task updates
- Comments and notifications
- Live cursors (Phase 2)
"""
import logging
from typing import Dict, Optional, Set, Any
import socketio
from fastapi import HTTPException

from app.core.config import settings
from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.models.user import User
from app.models.project import Project
from app.modules.collaboration.models import ProjectCollaborator

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    Manages WebSocket connections and real-time events.

    Features:
    - Socket.IO integration with FastAPI
    - JWT authentication for WebSocket connections
    - Project-based rooms for broadcasting
    - Permission-based event access
    - Optional Redis pub/sub for horizontal scaling
    """

    def __init__(self):
        """Initialize Socket.IO server with optional Redis"""
        # Socket.IO server configuration
        if settings.REDIS_ENABLED:
            # Production: Use Redis for pub/sub (horizontal scaling)
            logger.info(f"Initializing Socket.IO with Redis at {settings.REDIS_URL}")
            self.sio = socketio.AsyncServer(
                async_mode='asgi',
                cors_allowed_origins='*',  # Configure based on CORS settings
                logger=True,
                engineio_logger=False,
                client_manager=socketio.AsyncRedisManager(settings.REDIS_URL)
            )
        else:
            # Development: In-memory (single server)
            logger.info("Initializing Socket.IO in-memory mode (development)")
            self.sio = socketio.AsyncServer(
                async_mode='asgi',
                cors_allowed_origins='*',
                logger=True,
                engineio_logger=False
            )

        # Track active connections: {sid: user_id}
        self.connections: Dict[str, str] = {}

        # Track user presence in projects: {project_id: {user_id: sid}}
        self.project_rooms: Dict[str, Dict[str, str]] = {}

        # Register event handlers
        self._register_handlers()

    def _register_handlers(self):
        """Register Socket.IO event handlers"""

        @self.sio.event
        async def connect(sid, environ, auth):
            """Handle client connection with JWT authentication"""
            logger.info(f"Client attempting to connect: {sid}")

            # Authenticate using JWT token
            token = auth.get('token') if auth else None
            if not token:
                logger.warning(f"Connection rejected - no token: {sid}")
                raise ConnectionRefusedError('Authentication required')

            try:
                # Decode JWT token
                payload = decode_access_token(token)
                user_id = payload.get("sub")

                if not user_id:
                    raise ConnectionRefusedError('Invalid token')

                # Verify user exists
                db = SessionLocal()
                try:
                    user = db.query(User).filter(User.id == user_id).first()
                    if not user:
                        raise ConnectionRefusedError('User not found')

                    # Store connection
                    self.connections[sid] = user_id

                    logger.info(f"Client connected: {sid} (user: {user_id})")

                    # Send connection success
                    await self.sio.emit('connected', {
                        'user_id': user_id,
                        'message': 'Successfully connected to real-time server'
                    }, to=sid)

                finally:
                    db.close()

            except Exception as e:
                logger.error(f"Authentication failed for {sid}: {e}")
                raise ConnectionRefusedError('Authentication failed')

        @self.sio.event
        async def disconnect(sid):
            """Handle client disconnection"""
            user_id = self.connections.get(sid)
            if user_id:
                logger.info(f"Client disconnected: {sid} (user: {user_id})")

                # Remove from all project rooms
                for project_id, users in list(self.project_rooms.items()):
                    if user_id in users and users[user_id] == sid:
                        del users[user_id]
                        # Notify others in the room
                        await self.sio.emit('user:left', {
                            'user_id': user_id,
                            'project_id': project_id
                        }, room=f"project:{project_id}", skip_sid=sid)

                        if not users:
                            del self.project_rooms[project_id]

                # Remove connection
                del self.connections[sid]

        @self.sio.event
        async def join_project(sid, data):
            """Join a project room for real-time updates"""
            user_id = self.connections.get(sid)
            if not user_id:
                await self.sio.emit('error', {'message': 'Not authenticated'}, to=sid)
                return

            project_id = data.get('project_id')
            if not project_id:
                await self.sio.emit('error', {'message': 'project_id required'}, to=sid)
                return

            # Verify user has access to project
            db = SessionLocal()
            try:
                # Check if user is project owner or collaborator
                project = db.query(Project).filter(Project.id == project_id).first()

                has_access = False
                if project and project.user_id == user_id:
                    has_access = True
                else:
                    # Check collaboration
                    collab = db.query(ProjectCollaborator).filter(
                        ProjectCollaborator.project_id == project_id,
                        ProjectCollaborator.user_id == user_id
                    ).first()
                    if collab:
                        has_access = True

                if not has_access:
                    await self.sio.emit('error', {
                        'message': 'Access denied to project'
                    }, to=sid)
                    return

                # Join Socket.IO room
                room_name = f"project:{project_id}"
                await self.sio.enter_room(sid, room_name)

                # Track in project rooms
                if project_id not in self.project_rooms:
                    self.project_rooms[project_id] = {}
                self.project_rooms[project_id][user_id] = sid

                logger.info(f"User {user_id} joined project room: {project_id}")

                # Notify user
                await self.sio.emit('joined_project', {
                    'project_id': project_id,
                    'message': f'Joined project {project_id}'
                }, to=sid)

                # Notify others in the room
                await self.sio.emit('user:joined', {
                    'user_id': user_id,
                    'project_id': project_id
                }, room=room_name, skip_sid=sid)

            finally:
                db.close()

        @self.sio.event
        async def leave_project(sid, data):
            """Leave a project room"""
            user_id = self.connections.get(sid)
            if not user_id:
                return

            project_id = data.get('project_id')
            if not project_id:
                return

            room_name = f"project:{project_id}"
            await self.sio.leave_room(sid, room_name)

            # Remove from tracking
            if project_id in self.project_rooms:
                if user_id in self.project_rooms[project_id]:
                    del self.project_rooms[project_id][user_id]

                if not self.project_rooms[project_id]:
                    del self.project_rooms[project_id]

            logger.info(f"User {user_id} left project room: {project_id}")

            # Notify others
            await self.sio.emit('user:left', {
                'user_id': user_id,
                'project_id': project_id
            }, room=room_name)

        @self.sio.event
        async def ping(sid, data):
            """Handle ping/keepalive"""
            await self.sio.emit('pong', {'timestamp': data.get('timestamp')}, to=sid)

    async def broadcast_boq_update(
        self,
        project_id: str,
        item_id: str,
        updates: Dict[str, Any],
        user_id: str
    ):
        """
        Broadcast BoQ item update to all users in the project room.

        Args:
            project_id: Project ID
            item_id: BoQ item ID
            updates: Dictionary of updated fields
            user_id: User who made the update
        """
        room_name = f"project:{project_id}"

        await self.sio.emit('boq:item:updated', {
            'project_id': project_id,
            'item_id': item_id,
            'updates': updates,
            'updated_by': user_id
        }, room=room_name)

        logger.info(f"Broadcasted BoQ update for item {item_id} to project {project_id}")

    async def broadcast_task_update(
        self,
        project_id: str,
        task_id: int,
        updates: Dict[str, Any],
        user_id: str
    ):
        """Broadcast task update to project room"""
        room_name = f"project:{project_id}"

        await self.sio.emit('task:updated', {
            'project_id': project_id,
            'task_id': task_id,
            'updates': updates,
            'updated_by': user_id
        }, room=room_name)

        logger.info(f"Broadcasted task update for task {task_id} to project {project_id}")

    async def broadcast_comment(
        self,
        project_id: str,
        comment_id: int,
        comment_data: Dict[str, Any]
    ):
        """Broadcast new comment to project room"""
        room_name = f"project:{project_id}"

        await self.sio.emit('comment:created', {
            'project_id': project_id,
            'comment_id': comment_id,
            'comment': comment_data
        }, room=room_name)

        logger.info(f"Broadcasted comment {comment_id} to project {project_id}")

    async def notify_user(
        self,
        user_id: str,
        notification_data: Dict[str, Any]
    ):
        """
        Send notification to a specific user (if online).

        Args:
            user_id: Target user ID
            notification_data: Notification payload
        """
        # Find user's socket ID across all project rooms
        for project_id, users in self.project_rooms.items():
            if user_id in users:
                sid = users[user_id]
                await self.sio.emit('notification:new', notification_data, to=sid)
                logger.info(f"Sent notification to user {user_id}")
                return

        logger.debug(f"User {user_id} not online - notification not sent via WebSocket")

    def get_asgi_app(self):
        """Get ASGI app for mounting in FastAPI"""
        return socketio.ASGIApp(
            self.sio,
            socketio_path='socket.io'
        )

    def get_online_users(self, project_id: str) -> Set[str]:
        """Get set of user IDs currently online in a project"""
        return set(self.project_rooms.get(project_id, {}).keys())


# Singleton instance
websocket_manager = WebSocketManager()
