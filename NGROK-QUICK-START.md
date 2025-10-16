# ngrok Quick Start - Fix "Cannot Connect to Server" Error

**Problem:** ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ (Cannot connect to server) when testing on mobile via ngrok

**Root Cause:** Frontend trying to connect to `localhost:5000` which doesn't exist on mobile device

**Quick Fix (3 Steps):**

## 1️⃣ Kill current ngrok and start with backend tunnel

```bash
# Kill current ngrok
taskkill /F /IM ngrok.exe

# Start ngrok for BOTH frontend and backend
start ngrok http 3000
start ngrok http 5000
```

## 2️⃣ Run automated setup script

```bash
npm run setup:ngrok
```

This will:
- ✅ Detect your ngrok URLs automatically
- ✅ Update .env files with correct ngrok URLs
- ✅ Configure CORS properly

## 3️⃣ Restart servers

```bash
# Stop current servers (Ctrl+C in both windows)

# Restart frontend
npm run dev

# Restart backend
cd backend
npm run dev
```

## ✅ Done!

Open your ngrok frontend URL on mobile (you'll see it in the setup script output).

Example: `https://abc123.ngrok-free.app`

---

## Alternative: Manual Setup

If the automated script doesn't work:

1. **Get ngrok URLs:** http://localhost:4040

2. **Update .env:**
   ```env
   REACT_APP_API_URL=https://YOUR-BACKEND-URL.ngrok-free.app/api/v1
   CORS_ORIGIN=https://YOUR-FRONTEND-URL.ngrok-free.app
   ```

3. **Update backend/.env:**
   ```env
   CORS_ORIGIN=https://YOUR-FRONTEND-URL.ngrok-free.app
   ```

4. **Restart both servers**

---

## Troubleshooting

**Issue:** "ngrok API not available"
- Make sure ngrok is running: check http://localhost:4040

**Issue:** Still can't connect
- Clear mobile browser cache
- Try incognito/private mode
- Check both servers are running (frontend:3000, backend:5000)

---

**Current Status:**
- Frontend ngrok: `https://d3746fbe145a.ngrok-free.app` ✅
- Backend ngrok: ❌ Not running (need to start)

**Next Action:**
Run the 3 steps above to fix the connection issue!
