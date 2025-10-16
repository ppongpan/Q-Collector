# Free Mobile Testing Alternatives (No ngrok Needed!)

**Version:** v0.7.8-dev
**Date:** 2025-10-11

## Summary of Free Options

Here are **5 completely free** ways to test Q-Collector on mobile without ngrok:

| Method | Cost | Speed | Setup Time | Best For |
|--------|------|-------|------------|----------|
| **1. Local Network** ⭐ | Free | Fastest | 2 min | **Recommended** |
| 2. LocalTunnel | Free | Fast | 3 min | Quick demos |
| 3. Serveo | Free | Medium | 1 min | SSH users |
| 4. localhost.run | Free | Medium | 1 min | Simple tests |
| 5. Cloudflare Tunnel | Free | Fast | 5 min | Production-like |

---

## 1️⃣ Local Network (RECOMMENDED) ⭐

**Already Configured!** ✅

### Your Setup:
- ✅ PC IP: `192.168.1.181`
- ✅ Environment files updated
- ✅ CORS configured
- ✅ React dev server configured

### Next Steps:

**1. Restart Servers:**
```bash
# Kill current servers (Ctrl+C in both terminals)

# Restart frontend
npm run dev

# Restart backend (in another terminal)
cd backend
npm run dev
```

**2. Connect Phone to Same WiFi:**
- Make sure your phone is on the SAME WiFi network as your PC
- WiFi name: Check your PC's WiFi connection

**3. Open on Mobile:**
```
http://192.168.1.181:3000
```

**4. Allow Firewall (if prompted):**
- Windows Firewall will ask for permission
- ✅ Check "Private networks"
- ✅ Click "Allow access"

### Advantages:
- ✅ **100% Free** - No accounts, no limits
- ✅ **Fastest** - Direct connection, no tunnels
- ✅ **Most Stable** - No disconnections
- ✅ **Unlimited** - Test on multiple devices
- ✅ **Private** - Everything stays local

### Limitations:
- ❌ Phone must be on same WiFi
- ❌ Can't test from outside your network

---

## 2️⃣ LocalTunnel (ngrok Alternative)

**Free, unlimited, no account needed**

### Setup:
```bash
# Install globally (one time)
npm install -g localtunnel

# Start tunnels (2 terminals)
lt --port 3000 --subdomain qcollector-frontend
lt --port 5000 --subdomain qcollector-backend
```

### Update .env:
```env
REACT_APP_API_URL=https://qcollector-backend.loca.lt/api/v1
CORS_ORIGIN=https://qcollector-frontend.loca.lt
```

### Mobile:
```
https://qcollector-frontend.loca.lt
```

**Note:** You'll see a warning page first - click "Continue"

### Pros:
- ✅ Free, unlimited
- ✅ No account needed
- ✅ Works anywhere

### Cons:
- ⚠️ Warning page on first visit
- ⚠️ URLs change on restart (unless you use --subdomain)

---

## 3️⃣ Serveo (SSH Tunnel)

**Free, simple, no installation**

### Setup:
```bash
# Frontend tunnel
ssh -R 80:localhost:3000 serveo.net

# Backend tunnel (new terminal)
ssh -R 80:localhost:5000 serveo.net
```

You'll get URLs like:
```
Forwarding HTTP traffic from https://abc123.serveo.net
```

### Update .env:
```env
REACT_APP_API_URL=https://BACKEND-URL.serveo.net/api/v1
CORS_ORIGIN=https://FRONTEND-URL.serveo.net
```

### Pros:
- ✅ Free, unlimited
- ✅ No installation (uses SSH)
- ✅ Works anywhere

### Cons:
- ⚠️ Requires SSH client
- ⚠️ Random URLs

---

## 4️⃣ localhost.run (SSH Tunnel)

**Similar to Serveo, different provider**

### Setup:
```bash
# Frontend tunnel
ssh -R 80:localhost:3000 nokey@localhost.run

# Backend tunnel (new terminal)
ssh -R 80:localhost:5000 nokey@localhost.run
```

### Pros:
- ✅ Free, unlimited
- ✅ Very simple

### Cons:
- ⚠️ Random URLs
- ⚠️ Less reliable than LocalTunnel

---

## 5️⃣ Cloudflare Tunnel (cloudflared)

**Enterprise-grade, free forever**

### Setup:
```bash
# Install cloudflared
# Download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

# Start tunnels
cloudflared tunnel --url http://localhost:3000
cloudflared tunnel --url http://localhost:5000
```

### Pros:
- ✅ Enterprise-grade
- ✅ Very fast
- ✅ Free forever
- ✅ DDoS protection

### Cons:
- ⚠️ Requires installation
- ⚠️ Random URLs (unless you create a named tunnel)

---

## Quick Comparison

### Speed Ranking:
1. **Local Network** - Fastest (direct connection)
2. Cloudflare Tunnel - Very fast
3. LocalTunnel - Fast
4. Serveo - Medium
5. localhost.run - Medium

### Ease of Setup:
1. **Local Network** - Easiest (automated script) ⭐
2. Serveo - Very easy (one command)
3. localhost.run - Very easy
4. LocalTunnel - Easy (npm install)
5. Cloudflare - Medium (download required)

### Reliability:
1. **Local Network** - Most reliable ⭐
2. Cloudflare Tunnel - Very reliable
3. LocalTunnel - Reliable
4. Serveo - Good
5. localhost.run - Fair

---

## Recommended Workflow

### For Daily Development:
Use **Local Network** (fastest, most stable)
```bash
npm run setup:local  # One-time setup
npm run dev          # Start developing
```
Access: `http://192.168.1.181:3000`

### For Quick Demos (outside your network):
Use **LocalTunnel** (easy, reliable)
```bash
lt --port 3000
lt --port 5000
```

### For Production-Like Testing:
Use **Cloudflare Tunnel** (enterprise features)
```bash
cloudflared tunnel --url http://localhost:3000
```

---

## Current Status

✅ **Local Network Setup Complete**
- PC IP: `192.168.1.181`
- Frontend: `http://192.168.1.181:3000`
- Backend: `http://192.168.1.181:5000`
- Environment files: Updated ✅
- CORS: Configured ✅

**Next Action:**
1. Restart your servers (Ctrl+C, then `npm run dev`)
2. Connect phone to same WiFi
3. Open `http://192.168.1.181:3000` on mobile
4. Start testing! 🎉

---

## Troubleshooting

### Can't connect from mobile?
1. Check WiFi - phone and PC on SAME network?
2. Check Firewall - allow Node.js through Windows Firewall
3. Test connection - can you ping `192.168.1.181` from mobile?

### IP address changed?
Run again:
```bash
npm run setup:local
```

### Still prefer ngrok?
See `NGROK-SETUP.md` for ngrok configuration

---

## License

Internal use - Q-Collector Enterprise v0.7.8-dev
