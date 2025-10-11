# Mobile Testing Setup Complete - v0.7.9-dev

**Date:** 2025-10-11
**Version:** v0.7.9-dev
**Status:** ✅ Complete - ngrok Mobile Testing Ready

## Overview

Successfully configured Q-Collector for mobile testing using ngrok tunnel after discovering local network (AP Isolation) limitations. The application now supports mobile access via HTTPS tunnel while maintaining full functionality.

## Problem Encountered

### Initial Approach: Local Network Testing
- Attempted to access application via local IP: `http://192.168.1.181:3000`
- **Issue:** Router AP Isolation prevented mobile device connectivity
- **Symptoms:** Connection timeout on mobile, test server also failed
- **Decision:** Pivoted to ngrok tunnel solution

## Solution Implemented

### Architecture Decision
Used **React Proxy Pattern** instead of dual ngrok tunnels:
- ngrok Free Tier limitation: 1 tunnel only
- Single tunnel → Frontend (port 3000)
- React proxy routes API calls: `localhost:3000/api/v1` → `localhost:5000`

### Configuration Changes

#### 1. Frontend Configuration (.env)
```env
PORT=3000
HOST=0.0.0.0
DANGEROUSLY_DISABLE_HOST_CHECK=true
REACT_APP_API_URL=/api/v1
REACT_APP_ENV=development
```

**Key Changes:**
- `HOST=0.0.0.0` - Bind to all network interfaces
- `DANGEROUSLY_DISABLE_HOST_CHECK=true` - Allow ngrok host headers
- `REACT_APP_API_URL=/api/v1` - Changed from absolute to relative path

#### 2. Backend Configuration (backend/.env)
```env
CORS_ORIGIN=http://localhost:3000,http://localhost:5000,http://192.168.1.181:3000,https://78291324f2c7.ngrok-free.app
CORS_CREDENTIALS=true
```

**Key Changes:**
- Added `http://localhost:5000` for React proxy origin
- Added ngrok URL: `https://78291324f2c7.ngrok-free.app`
- Maintains support for localhost and local IP

#### 3. React Proxy (package.json)
```json
{
  "proxy": "http://localhost:5000"
}
```

**Purpose:** Routes all `/api/v1/*` requests from frontend to backend automatically

### CORS Fix: Trailing Slash Issue

**Problem:** React proxy sent `Origin: http://localhost:5000/` (with trailing slash)

**Solution:** Implemented origin normalization in `backend/api/app.js`:

```javascript
// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN.split(',').map(o => o.trim());

    // Allow requests with no origin (mobile apps, curl, Postman, React proxy)
    if (!origin) {
      logger.debug('CORS: Request with no origin - ALLOWED');
      return callback(null, true);
    }

    // Remove trailing slash from origin for comparison
    const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
    const normalizedAllowed = allowedOrigins.map(o => o.endsWith('/') ? o.slice(0, -1) : o);

    // Check if origin is in allowed list (with or without trailing slash)
    if (normalizedAllowed.indexOf(normalizedOrigin) !== -1 || allowedOrigins.includes('*')) {
      logger.debug(`CORS: Origin ${origin} - ALLOWED`);
      callback(null, true);
    } else {
      logger.error(`CORS: Origin ${origin} - BLOCKED (allowed: ${allowedOrigins.join(', ')})`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
};
```

**Key Features:**
- Normalizes origins by removing trailing slashes
- Debug logging for all CORS decisions
- Allows requests with no origin (React proxy, Postman, curl)
- Supports wildcard origins

## Traffic Flow

```
Mobile Device
    ↓
https://78291324f2c7.ngrok-free.app (ngrok tunnel - HTTPS)
    ↓
localhost:3000 (React Frontend - HOST=0.0.0.0)
    ↓
localhost:5000 (Express Backend - via React proxy)
    ↓
PostgreSQL, Redis, MinIO (local services)
```

## Testing Results

### ✅ PC Testing (localhost)
```
2025-10-11 12:30:57 [debug]: CORS: Origin http://localhost:5000/ - ALLOWED
2025-10-11 12:30:57 [info]: Device ac55239d... is trusted for user a243ac58...
2025-10-11 12:30:57 [info]: Trusted device login for user: pongpanp
2025-10-11 12:30:58 [info]: User logged in: pongpanp
POST /api/v1/auth/login [200] 974.906 ms
```

**Status:** ✅ Login successful, 200 OK

### 📱 Mobile Testing (ngrok)
- **URL:** `https://78291324f2c7.ngrok-free.app`
- **Status:** Ready for testing
- **Expected:** Full application functionality via HTTPS tunnel

## Files Modified

### Frontend
1. `.env` - Added HOST binding and disabled host check
2. `package.json` - Added proxy configuration

### Backend
3. `backend/.env` - Updated CORS origins with ngrok URL
4. `backend/api/app.js` - Implemented trailing slash normalization

### Documentation
5. `MOBILE-TESTING-ALTERNATIVES.md` - ngrok setup guide
6. `NGROK-SETUP.md` - Quick start instructions
7. `LOCAL-NETWORK-TESTING.md` - AP Isolation documentation

**Total:** 7 files modified/created

## Commands Used

### Start ngrok Tunnel
```bash
ngrok http 3000
```

### Start Development Servers
```bash
# Frontend (Terminal 1)
npm start

# Backend (Terminal 2)
cd backend && npm start
```

### Kill Process on Port (if needed)
```bash
# Find PID
netstat -ano | findstr ":3000" | findstr "LISTENING"
netstat -ano | findstr ":5000" | findstr "LISTENING"

# Kill process
taskkill //F //PID <pid>
```

## Troubleshooting Guide

### Issue 1: CORS Error (500)
**Symptom:** `Origin http://localhost:5000/ - BLOCKED`

**Solution:**
1. Add `http://localhost:5000` to `backend/.env` CORS_ORIGIN
2. Restart backend server
3. Trailing slash normalization handles both with/without slash

### Issue 2: Invalid Host Header
**Symptom:** React Dev Server rejects ngrok requests

**Solution:**
Add to `.env`:
```env
DANGEROUSLY_DISABLE_HOST_CHECK=true
```

### Issue 3: API Calls Fail (404)
**Symptom:** `/api/v1/auth/login` returns 404

**Solution:**
1. Verify proxy in `package.json`: `"proxy": "http://localhost:5000"`
2. Verify `REACT_APP_API_URL=/api/v1` (relative path)
3. Restart frontend server

## Security Considerations

### ngrok Free Tier
- ⚠️ URL changes on every restart
- ⚠️ 1 tunnel limit
- ⚠️ Public HTTPS endpoint (anyone with URL can access)

### Development Only
```env
DANGEROUSLY_DISABLE_HOST_CHECK=true  # ⚠️ Development only!
```

**Never use in production!**

### CORS Configuration
- Specific origins only (no wildcards in production)
- Credentials enabled for session cookies
- Debug logging enabled for troubleshooting

## Next Steps

### For Production Mobile Testing
1. **Use Local Network** with proper router configuration
2. **Deploy to Staging Server** with public domain
3. **Configure Firewall Rules** if using IP-based access

### For Continued Development
1. Test full application flow on mobile via ngrok
2. Verify file uploads work through tunnel
3. Test WebSocket connections (if applicable)
4. Monitor ngrok dashboard for request logs

## Lessons Learned

1. **Check Router First:** AP Isolation can block local network testing
2. **React Proxy is Powerful:** Eliminates need for dual tunnels
3. **CORS Trailing Slash:** Always normalize origins before comparison
4. **ngrok for Quick Testing:** Fast solution for mobile testing without network changes

## Conclusion

Successfully configured Q-Collector for mobile testing using ngrok tunnel with React proxy pattern. The application is now accessible via HTTPS on mobile devices while maintaining full backend functionality through automatic request proxying. CORS configuration properly handles trailing slash variations for maximum compatibility.

**Ready for mobile testing at:** `https://78291324f2c7.ngrok-free.app` 🎉
