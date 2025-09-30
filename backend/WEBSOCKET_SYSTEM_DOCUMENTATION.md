# Q-Collector WebSocket System Documentation

## Overview

The Q-Collector WebSocket system provides real-time capabilities for the form builder application, enabling live collaboration, instant notifications, and real-time updates.

## Features

### ✅ Real-time Form Collaboration
- Live form editing with multiple users
- Real-time field updates and structure changes
- User presence tracking
- Conflict prevention and version control

### ✅ Instant Notifications
- WebSocket-based push notifications
- Telegram bot integration
- Email notifications (optional)
- Multiple notification templates

### ✅ User Activity Tracking
- Online/offline status
- Current form tracking
- Typing indicators
- Activity monitoring

### ✅ System Broadcasting
- System-wide announcements
- Department-specific messages
- Role-based broadcasting
- Emergency notifications

### ✅ Security & Performance
- JWT authentication for WebSocket connections
- Rate limiting and spam protection
- Role-based access control
- Connection monitoring and analytics

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Client  │◄──►│  Express Server  │◄──►│ PostgreSQL DB   │
│                 │    │                  │    │                 │
│ Socket.IO Client│    │  Socket.IO       │    │ User/Form Data  │
└─────────────────┘    │  Server          │    └─────────────────┘
                       │                  │
                       │ WebSocket        │    ┌─────────────────┐
                       │ Services         │◄──►│   Redis Cache   │
                       │                  │    │                 │
                       │ - WebSocketSvc   │    │ Sessions/Rooms  │
                       │ - NotificationSvc│    └─────────────────┘
                       │ - EventHandlers  │
                       └──────────────────┘    ┌─────────────────┐
                                              ◄►│ Telegram Bot API│
                                               │                 │
                                               │ Push Notifications│
                                               └─────────────────┘
```

## Core Services

### 1. WebSocketService
**Location:** `backend/services/WebSocketService.js`

Manages WebSocket connections, rooms, and real-time communication.

**Key Features:**
- Connection authentication and management
- Room-based messaging (forms, users, departments)
- Rate limiting and security
- Redis adapter for scaling

**Usage:**
```javascript
const webSocketService = require('../services/WebSocketService');

// Broadcast to form room
webSocketService.broadcastToRoom('form:123', 'form:updated', data);

// Send to specific user
webSocketService.sendToUser(userId, 'notification:new', notification);

// Broadcast to role
webSocketService.broadcastToRole('admin', 'system:alert', alert);
```

### 2. NotificationService
**Location:** `backend/services/NotificationService.js`

Handles multi-channel notifications with templates and delivery tracking.

**Key Features:**
- Template-based notifications
- Multi-channel delivery (WebSocket, Telegram, Email)
- Delivery queue with retry logic
- Broadcast and targeted notifications

**Usage:**
```javascript
const notificationService = require('../services/NotificationService');

// Send notification
await notificationService.sendNotification({
  templateKey: 'form.created',
  recipients: [userId],
  data: { formTitle: 'New Form' },
  channels: ['websocket', 'telegram']
});

// Broadcast announcement
await notificationService.sendSystemAnnouncement({
  title: 'Maintenance Notice',
  body: 'System maintenance at 2 AM',
  priority: 'high'
});
```

### 3. RealtimeEventHandlers
**Location:** `backend/services/RealtimeEventHandlers.js`

Centralized event handlers for all real-time functionality.

**Key Features:**
- Form collaboration events
- Submission real-time updates
- User presence management
- System message broadcasting

**Usage:**
```javascript
const eventHandlers = require('../services/RealtimeEventHandlers');

// Handle form creation
await eventHandlers.handleFormCreate(formData, creatorData);

// Handle submission update
await eventHandlers.handleSubmissionUpdate(updateData, updaterData);
```

## WebSocket Events

### Client → Server Events

| Event | Description | Data |
|-------|-------------|------|
| `form:join` | Join form collaboration | `{ formId }` |
| `form:leave` | Leave form collaboration | `{ formId }` |
| `form:update` | Update form metadata | `{ formId, updateType, changes }` |
| `form:field:update` | Update specific field | `{ formId, fieldId, changes }` |
| `user:presence` | Update user presence | `{ status, currentForm }` |
| `user:typing` | Typing indicator | `{ formId, fieldId, isTyping }` |
| `ping` | Connection health check | `{}` |

### Server → Client Events

| Event | Description | Data |
|-------|-------------|------|
| `connection:established` | Connection successful | `{ userId, connectedAt }` |
| `form:updated` | Form was updated | `{ update, updater, timestamp }` |
| `form:user:joined` | User joined collaboration | `{ formId, user, timestamp }` |
| `form:user:left` | User left collaboration | `{ formId, user, timestamp }` |
| `notification:new` | New notification | `{ id, title, body, priority }` |
| `user:presence:updated` | User presence changed | `{ userId, status, currentForm }` |
| `system:message` | System broadcast | `{ type, message, priority }` |
| `rate_limit_exceeded` | Rate limit hit | `{ message, retryAfter }` |
| `pong` | Health check response | `{ timestamp }` |

## REST API Endpoints

### WebSocket Management
- `GET /api/v1/websocket/status` - WebSocket server status
- `GET /api/v1/websocket/users` - Connected users (Admin)
- `GET /api/v1/websocket/analytics` - Connection analytics (Admin)

### Broadcasting
- `POST /api/v1/websocket/broadcast/announcement` - System announcement (Admin)
- `POST /api/v1/websocket/broadcast/department` - Department message
- `POST /api/v1/websocket/notify/users` - Notify specific users (Admin)

### Collaboration
- `GET /api/v1/websocket/forms/:formId/collaboration` - Form collaboration status

### Testing
- `POST /api/v1/websocket/test/notification` - Send test notification

## Authentication

WebSocket connections use JWT authentication:

```javascript
// Client connection
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Or via headers
const socket = io('http://localhost:5000', {
  extraHeaders: {
    'Authorization': 'Bearer your-jwt-token'
  }
});
```

## Configuration

### Environment Variables

```env
# WebSocket Configuration
WEBSOCKET_ENABLED=true
WEBSOCKET_CORS_ORIGIN=http://localhost:3000

# Telegram Bot (for notifications)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_GROUP_ID=your-group-id

# Redis (for WebSocket scaling)
REDIS_URL=redis://localhost:6379

# Rate Limiting
WEBSOCKET_RATE_LIMIT_EVENTS=50
WEBSOCKET_RATE_LIMIT_WINDOW=60000
```

### Redis Configuration

The system uses Redis for:
- Session storage across multiple server instances
- Rate limiting data
- Connection metrics
- Notification queue

## Security

### Authentication
- JWT token validation for all connections
- User role and permission checking
- Token blacklist support for logout/revoked tokens

### Rate Limiting
- Connection-level rate limiting (50 events/minute default)
- Event-specific rate limiting
- Automatic disconnection for abuse

### Access Control
- Role-based permissions for events
- Department-based access restrictions
- Form ownership validation

### Data Protection
- Event data validation and sanitization
- Secure message encryption for sensitive data
- CORS protection for WebSocket connections

## Usage Examples

### Frontend Integration

```javascript
// Connect to WebSocket
import io from 'socket.io-client';

const token = localStorage.getItem('authToken');
const socket = io('http://localhost:5000', {
  auth: { token }
});

// Listen for notifications
socket.on('notification:new', (notification) => {
  showNotification(notification.title, notification.body);
});

// Join form collaboration
socket.emit('form:join', { formId: '123' });

// Listen for form updates
socket.on('form:updated', (data) => {
  updateFormUI(data.update);
});

// Send typing indicator
socket.emit('user:typing', {
  formId: '123',
  fieldId: 'field-456',
  isTyping: true
});
```

### Backend Integration

```javascript
// In your API routes
const webSocketIntegration = require('../utils/websocket-integration.util');

// Add WebSocket middleware
app.use('/api/v1', webSocketIntegration.middleware());

// In route handlers
router.post('/forms', async (req, res) => {
  const form = await Form.create(req.body);

  // Emit WebSocket event
  await req.websocket.emit.formCreated(form);

  res.json({ success: true, data: form });
});
```

## Testing

Run the WebSocket test suite:

```bash
cd backend
node tests/websocket.test.js
```

Tests include:
- Connection establishment
- Authentication
- Room joining/leaving
- Form collaboration
- Notification delivery
- Rate limiting
- Broadcasting

## Monitoring

### WebSocket Statistics
```javascript
// Get connection stats
const stats = webSocketService.getStats();
// Returns: { connectedUsers, activeCollaborations, userPresence }

// Get notification stats
const notificationStats = await notificationService.getStats();
// Returns: { queueSize, templates, retryQueue }
```

### Performance Metrics
- Connection duration
- Event frequency per user
- Message delivery success rates
- Rate limit violations

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check JWT token validity
   - Verify CORS configuration
   - Ensure WebSocket server is running

2. **Events Not Received**
   - Check user permissions
   - Verify room membership
   - Check rate limiting status

3. **High CPU Usage**
   - Review rate limiting settings
   - Check for event loops
   - Monitor connection count

### Debug Mode

Enable WebSocket debugging:

```env
DEBUG=socket.io:*
NODE_ENV=development
```

### Logs

WebSocket events are logged with Winston:
- Connection/disconnection events
- Authentication failures
- Rate limit violations
- Error conditions

## Scaling

### Multiple Server Instances

The system supports horizontal scaling using Redis adapter:

```javascript
// Automatically configured in WebSocketService
const { createAdapter } = require('@socket.io/redis-adapter');
io.adapter(createAdapter(pubClient, subClient));
```

### Load Balancing

Configure sticky sessions for WebSocket connections:

```nginx
upstream backend {
    ip_hash;  # Sticky sessions
    server backend1:5000;
    server backend2:5000;
}
```

## Future Enhancements

### Planned Features
- Voice/video collaboration integration
- Advanced analytics dashboard
- Machine learning for user behavior
- Mobile push notifications
- Advanced conflict resolution
- Real-time form preview sharing

### Performance Optimizations
- Message compression
- Connection pooling
- Event batching
- Caching strategies

---

**Version:** 1.0.0
**Last Updated:** 2025-09-30
**Author:** Q-Collector Development Team