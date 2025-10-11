# ngrok Mobile Testing Setup Guide

**Version:** v0.7.8-dev
**Purpose:** Configure Q-Collector for mobile testing via ngrok
**Status:** 🟢 Ready to use

## Problem Statement

When testing the Q-Collector app on mobile devices via ngrok, you encounter:
- ❌ "Cannot connect to server" error (ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์)
- ❌ API calls fail because frontend tries to connect to `localhost:5000` (doesn't exist on mobile)
- ❌ CORS blocks requests from ngrok domain

## Root Cause

1. **Frontend .env:** `REACT_APP_API_URL=http://localhost:5000/api/v1`
   - Mobile device can't access `localhost` (it refers to the phone itself)
2. **Backend CORS:** `CORS_ORIGIN=http://localhost:3000`
   - Blocks requests from ngrok URLs

## Solution

Use ngrok to expose **both** frontend and backend, then update configuration files.

---

## Step-by-Step Setup

### 1️⃣ Stop Current ngrok Tunnel

```bash
# Press Ctrl+C to stop the current ngrok process
# Or kill the process if running in background
taskkill /F /IM ngrok.exe
```

### 2️⃣ Start ngrok with Multi-Tunnel Configuration

```bash
# Option 1: Use the provided ngrok.yml config
ngrok start --all --config ngrok.yml

# Option 2: Start tunnels individually
ngrok http 3000 --log=stdout > ngrok-frontend.log &
ngrok http 5000 --log=stdout > ngrok-backend.log &
```

### 3️⃣ Get ngrok URLs

Open the ngrok web interface: http://localhost:4040

You'll see two tunnels:
- **Frontend:** `https://abc123.ngrok-free.app` (port 3000)
- **Backend:** `https://def456.ngrok-free.app` (port 5000)

**Copy both URLs** - you'll need them in the next step.

### 4️⃣ Update Environment Variables

#### Frontend (.env)
```bash
# Option 1: Use the automated script
npm run setup:ngrok

# Option 2: Manual update
# Edit .env and change:
REACT_APP_API_URL=https://def456.ngrok-free.app/api/v1
#                  ^^^^^^^^^^^^^^^^^^^^^^^^
#                  Your backend ngrok URL

CORS_ORIGIN=https://abc123.ngrok-free.app
#           ^^^^^^^^^^^^^^^^^^^^^^^^
#           Your frontend ngrok URL
```

#### Backend (backend/.env)
```bash
# Edit backend/.env and change:
CORS_ORIGIN=https://abc123.ngrok-free.app
#           ^^^^^^^^^^^^^^^^^^^^^^^^
#           Your frontend ngrok URL
```

### 5️⃣ Restart Servers

```bash
# Stop current servers (Ctrl+C in both terminal windows)

# Restart frontend
cd C:\Users\Pongpan\Documents\24Sep25
npm run dev

# Restart backend
cd C:\Users\Pongpan\Documents\24Sep25\backend
npm run dev
```

### 6️⃣ Test on Mobile

1. Open mobile browser
2. Navigate to: `https://abc123.ngrok-free.app` (your frontend ngrok URL)
3. You may see an ngrok warning page → Click "Visit Site"
4. App should now load and connect to backend successfully! ✅

---

## Quick Reference

### Current ngrok URLs (as of last check)

- **Frontend:** `https://d3746fbe145a.ngrok-free.app`
- **Backend:** (Not yet configured - need to start backend tunnel)

### Configuration Files

- `ngrok.yml` - Multi-tunnel configuration
- `.env.ngrok` - Frontend environment template for ngrok
- `backend/.env.ngrok` - Backend environment template for ngrok
- `.env` - Active frontend configuration
- `backend/.env` - Active backend configuration

### Automated Scripts

```bash
# Setup ngrok configuration (interactive)
npm run setup:ngrok

# Switch to ngrok mode
npm run env:ngrok

# Switch back to localhost mode
npm run env:local
```

---

## Troubleshooting

### Issue: ngrok shows "Tunnel not found"

**Solution:** Make sure you have an ngrok account and authtoken configured.

```bash
# Sign up at https://ngrok.com
# Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
# Configure it:
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### Issue: "Visit Site" button doesn't appear on ngrok warning page

**Solution:** ngrok free tier requires manual confirmation. Alternative:
1. Use ngrok reserved domains (paid tier)
2. Or use localhost network access instead of ngrok

### Issue: CORS error after updating environment

**Solution:** Make sure you restarted **both** frontend and backend servers after changing .env files.

### Issue: Mobile still shows "Cannot connect to server"

**Checklist:**
- ✅ ngrok tunnels are running (check http://localhost:4040)
- ✅ Frontend .env has `REACT_APP_API_URL=https://YOUR-BACKEND-NGROK-URL/api/v1`
- ✅ Backend .env has `CORS_ORIGIN=https://YOUR-FRONTEND-NGROK-URL`
- ✅ Both servers restarted after env changes
- ✅ Mobile browser is accessing the frontend ngrok URL (not localhost)

---

## Network Diagram

```
┌─────────────────┐
│  Mobile Device  │
│   (anywhere)    │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│   ngrok Cloud   │
│  Secure Tunnel  │
└────────┬────────┘
         │
    ┌────┴─────┐
    │          │
    ▼          ▼
┌────────┐  ┌────────┐
│Frontend│  │Backend │
│ :3000  │  │ :5000  │
└────────┘  └────────┘
    │          │
    └────┬─────┘
         ▼
┌─────────────────┐
│   PostgreSQL    │
│   Redis/MinIO   │
└─────────────────┘
```

**Before ngrok:**
- Mobile → localhost:3000 ❌ (can't reach)
- Frontend → localhost:5000 ❌ (can't reach from mobile)

**After ngrok:**
- Mobile → https://abc.ngrok-free.app ✅
- Frontend → https://def.ngrok-free.app/api/v1 ✅

---

## Advanced: Automated ngrok Setup Script

See `scripts/setup-ngrok.js` for automated configuration that:
1. Reads current ngrok tunnels
2. Updates .env files automatically
3. Restarts servers
4. Provides mobile testing URL

---

## Important Notes

⚠️ **Security Warning:** ngrok URLs are publicly accessible. Don't share them publicly or use them for sensitive data.

⚠️ **Free Tier Limits:**
- ngrok free tier: 1 online ngrok process, 40 connections/minute
- URLs change every time you restart ngrok (unless you use reserved domains)

⚠️ **Production:** This setup is for **development/testing only**. Don't use ngrok in production.

✅ **Best Practice:** Create `.env.local` and `.env.ngrok` files, then copy the appropriate one to `.env` when switching contexts.

---

## License

Internal use - Q-Collector Enterprise v0.7.8-dev
