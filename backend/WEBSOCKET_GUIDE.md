# WebSocket/Socket.IO Integration Guide

## Overview

SkyBuild Pro now includes real-time collaboration features powered by Socket.IO and optional Redis pub/sub for horizontal scaling.

## Architecture

- **Socket.IO Server**: Integrated with FastAPI via ASGI
- **Authentication**: JWT-based WebSocket authentication
- **Rooms**: Project-based rooms for broadcasting
- **Scaling**: Optional Redis for multi-server deployment

## Configuration

### Environment Variables

```bash
# Development (in-memory, single server)
REDIS_ENABLED=false

# Production (Redis pub/sub, multi-server)
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379/0
```

### Installation

Redis is **optional** for development:

```bash
# Install Redis (macOS)
brew install redis
brew services start redis

# Install Redis (Ubuntu)
sudo apt-get install redis-server
sudo systemctl start redis
```

Dependencies are already in `requirements.txt`:
- `redis==5.0.1`
- `python-socketio==5.11.0`
- `aioredis==2.0.1`

## Client Connection

### JavaScript/TypeScript Example

```typescript
import io from 'socket.io-client';

// Get JWT token from your auth system
const token = localStorage.getItem('access_token');

// Connect to WebSocket server
const socket = io('http://localhost:8000', {
  path: '/socket.io',
  auth: {
    token: token
  },
  transports: ['websocket', 'polling']
});

// Connection events
socket.on('connected', (data) => {
  console.log('Connected:', data);
  // data = { user_id: 'xxx', message: 'Successfully connected...' }
});

socket.on('error', (data) => {
  console.error('Error:', data);
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});
```

## Project Rooms

### Join a Project Room

To receive real-time updates for a project, join its room:

```typescript
// Join project room
socket.emit('join_project', { project_id: 'proj-123' });

// Listen for confirmation
socket.on('joined_project', (data) => {
  console.log('Joined project:', data);
  // data = { project_id: 'proj-123', message: 'Joined project...' }
});

// Listen for other users joining
socket.on('user:joined', (data) => {
  console.log('User joined:', data);
  // data = { user_id: 'user-456', project_id: 'proj-123' }
});
```

### Leave a Project Room

```typescript
socket.emit('leave_project', { project_id: 'proj-123' });
```

## Real-Time Events

### BoQ Item Updates

Listen for real-time BoQ item changes:

```typescript
socket.on('boq:item:updated', (data) => {
  console.log('BoQ item updated:', data);
  // data = {
  //   project_id: 'proj-123',
  //   item_id: 'item-789',
  //   updates: { qty: 150, unit_price: 45.5 },
  //   updated_by: 'user-456'
  // }

  // Update your UI to reflect the change
  updateBoqItemInUI(data.item_id, data.updates);
});
```

### Bulk BoQ Updates

```typescript
socket.on('boq:bulk:updated', (data) => {
  console.log('Bulk update:', data);
  // data = {
  //   project_id: 'proj-123',
  //   summary: { total: 50, updated: 48, skipped: 2 },
  //   updated_by: 'user-456'
  // }

  // Refresh the BoQ list or show notification
  showNotification(`${data.summary.updated} items updated by another user`);
  refreshBoqList();
});
```

### Task Updates

```typescript
socket.on('task:updated', (data) => {
  console.log('Task updated:', data);
  // data = {
  //   project_id: 'proj-123',
  //   task_id: 42,
  //   updates: { status: 'done', assignee_id: 'user-789' },
  //   updated_by: 'user-456'
  // }

  updateTaskInUI(data.task_id, data.updates);
});
```

### Comments

```typescript
socket.on('comment:created', (data) => {
  console.log('New comment:', data);
  // data = {
  //   project_id: 'proj-123',
  //   comment_id: 15,
  //   comment: { text: 'Great work!', author_id: 'user-456', ... }
  // }

  addCommentToUI(data.comment);
});
```

### Notifications

```typescript
socket.on('notification:new', (data) => {
  console.log('New notification:', data);
  // Show toast/notification to user
  showToast(data.message);
});
```

### User Presence

Track when users join/leave the project:

```typescript
socket.on('user:joined', (data) => {
  console.log(`User ${data.user_id} joined project ${data.project_id}`);
  addUserToPresenceList(data.user_id);
});

socket.on('user:left', (data) => {
  console.log(`User ${data.user_id} left project ${data.project_id}`);
  removeUserFromPresenceList(data.user_id);
});
```

## Backend Broadcasting

### From Service Layer

The BoQ service automatically broadcasts updates:

```python
from app.services.websocket import websocket_manager

# Broadcast BoQ update
await websocket_manager.broadcast_boq_update(
    project_id='proj-123',
    item_id='item-789',
    updates={'qty': 150, 'unit_price': 45.5},
    user_id='user-456'
)

# Broadcast task update
await websocket_manager.broadcast_task_update(
    project_id='proj-123',
    task_id=42,
    updates={'status': 'done'},
    user_id='user-456'
)

# Broadcast comment
await websocket_manager.broadcast_comment(
    project_id='proj-123',
    comment_id=15,
    comment_data={'text': 'Great work!', 'author_id': 'user-456'}
)

# Notify specific user
await websocket_manager.notify_user(
    user_id='user-789',
    notification_data={'message': 'You were assigned a task'}
)
```

## API Endpoints

### WebSocket Status

```bash
GET /ws/status
```

Response:
```json
{
  "enabled": true,
  "redis_enabled": false,
  "endpoint": "/socket.io",
  "active_connections": 12,
  "active_project_rooms": 3
}
```

## Testing WebSocket Connection

### Using Browser Console

```javascript
// Load Socket.IO client
const script = document.createElement('script');
script.src = 'https://cdn.socket.io/4.5.4/socket.io.min.js';
document.head.appendChild(script);

// After script loads, connect
const token = 'your_jwt_token_here';
const socket = io('http://localhost:8000', {
  path: '/socket.io',
  auth: { token: token },
  transports: ['websocket']
});

socket.on('connected', console.log);
socket.on('error', console.error);

// Join a project
socket.emit('join_project', { project_id: 'your-project-id' });
socket.on('joined_project', console.log);

// Listen for updates
socket.on('boq:item:updated', console.log);
```

### Using Python Client

```python
import socketio

sio = socketio.Client()

@sio.event
def connected(data):
    print('Connected:', data)

@sio.event
def joined_project(data):
    print('Joined project:', data)

@sio.on('boq:item:updated')
def on_boq_update(data):
    print('BoQ updated:', data)

# Connect with JWT
sio.connect('http://localhost:8000',
            socketio_path='/socket.io',
            auth={'token': 'your_jwt_token'})

# Join project
sio.emit('join_project', {'project_id': 'proj-123'})

# Keep connection alive
sio.wait()
```

## Error Handling

### Connection Errors

```typescript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);

  if (error.message === 'Authentication required') {
    // Token missing or invalid - redirect to login
    window.location.href = '/login';
  }
});
```

### Permission Errors

```typescript
socket.on('error', (data) => {
  if (data.message === 'Access denied to project') {
    console.error('You don\'t have access to this project');
    // Show error message to user
  }
});
```

## Performance Considerations

### Connection Pooling

Socket.IO maintains a connection pool. Each user typically has 1 persistent connection.

### Room Optimization

- Users only receive events for projects they've joined
- Automatic cleanup when users disconnect
- Efficient room management via Redis (production)

### Scaling

**Development (Single Server):**
- In-memory event broadcasting
- No Redis required
- Suitable for testing and small deployments

**Production (Multi-Server):**
- Redis pub/sub for cross-server events
- Horizontal scaling with load balancer
- Session affinity not required

Example production setup:
```
Load Balancer (nginx)
    ├── App Server 1 ─┐
    ├── App Server 2 ─┼─ Redis Pub/Sub
    └── App Server 3 ─┘
```

## Security

### Authentication

- JWT token required for connection
- Token validated on connect
- Connection rejected if invalid

### Authorization

- Project access verified when joining rooms
- Users can only join projects they have access to
- Permission checks use existing RBAC system

### CORS

Configure allowed origins in `main.py`:
```python
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=['https://yourdomain.com']
)
```

## Troubleshooting

### Connection Refused

**Problem:** `ConnectionRefusedError: Authentication required`

**Solution:** Ensure JWT token is provided in auth:
```typescript
socket = io('http://localhost:8000', {
  auth: { token: yourToken }  // Must include this
});
```

### Cannot Join Project

**Problem:** `error: Access denied to project`

**Solutions:**
- Verify user has collaborator access to the project
- Check project_id is correct
- Ensure user is authenticated

### Events Not Received

**Solutions:**
- Verify you've joined the project room: `socket.emit('join_project', {...})`
- Check connection status: `socket.connected`
- Listen for `connect_error` events

### Redis Connection Failed

**Problem:** WebSocket server fails to start with Redis enabled

**Solution:**
- Ensure Redis is running: `redis-cli ping` (should return `PONG`)
- Check REDIS_URL is correct
- For development, set `REDIS_ENABLED=false`

## Monitoring

### Active Connections

Check WebSocket status:
```bash
curl http://localhost:8000/ws/status
```

### Logs

WebSocket events are logged at INFO level:
- `Client connected: {sid} (user: {user_id})`
- `User {user_id} joined project room: {project_id}`
- `Broadcasted BoQ update for item {item_id} to project {project_id}`

## Next Steps

1. **Frontend Integration:** Create WebSocket provider hook in React
2. **Live Cursors:** Track real-time cursor positions (Phase 2)
3. **Presence Indicators:** Show who's online in project
4. **Typing Indicators:** Show when users are typing comments
5. **Reconnection Logic:** Handle network interruptions gracefully
