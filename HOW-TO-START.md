# 🚀 How to Start Q-Collector Application

**Quick Start Guide**

---

## Method 1: Automated Script (Recommended) ⚡

### Step 1: Open Docker Desktop
- Find Docker Desktop icon on taskbar or Start menu
- Double-click to open
- **Wait for green status indicator** (30-60 seconds)

### Step 2: Run Startup Script
Double-click this file:
```
START-APP.bat
```

The script will automatically:
- ✅ Check Docker is running
- ✅ Start all Docker services (PostgreSQL, Redis, MinIO, LibreTranslate)
- ✅ Start Backend API server (port 5000)
- ✅ Start Frontend dev server (port 3000)

### Step 3: Access Application
Open browser and go to:
```
http://localhost:3000
```

---

## Method 2: Manual Start 🔧

### Step 1: Start Docker Services
```bash
docker-compose up -d postgres redis minio libretranslate
```

Wait 30 seconds for services to initialize.

### Step 2: Start Backend
Open Terminal 1:
```bash
cd backend
npm start
```

Backend runs on: http://localhost:5000

### Step 3: Start Frontend
Open Terminal 2:
```bash
npm start
```

Frontend runs on: http://localhost:3000

---

## 🌐 Service URLs

After startup, these services will be available:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Q-Collector Web UI |
| **Backend API** | http://localhost:5000 | REST API Server |
| **PostgreSQL** | localhost:5432 | Database |
| **Redis** | localhost:6379 | Cache & Sessions |
| **MinIO** | http://localhost:9000 | File Storage |
| **LibreTranslate** | http://localhost:5555 | Translation API |

---

## 🛑 How to Stop Application

### Stop Servers:
- Close both command windows (Backend & Frontend)

### Stop Docker Services:
```bash
docker-compose down
```

### Stop Everything:
```bash
docker-compose down -v
```
⚠️ **Warning:** `-v` flag removes data volumes (deletes database data)

---

## 🔍 Check if Services are Running

### Check Docker Containers:
```bash
docker-compose ps
```

Should show:
- postgres (Up)
- redis (Up)
- minio (Up)
- libretranslate (Up)

### Check Backend API:
```bash
curl http://localhost:5000/api/v1/health
```

Should return: `{"status":"ok"}`

### Check Frontend:
Open browser: http://localhost:3000

---

## 🆘 Troubleshooting

### Problem: Docker is not running
**Solution:**
```
1. Open Docker Desktop application
2. Wait for green indicator
3. Run START-APP.bat again
```

### Problem: Port already in use
**Solution:**
```bash
# Check what's using the port
netstat -ano | findstr :3000
netstat -ano | findstr :5000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Problem: PostgreSQL connection refused
**Solution:**
```bash
# Restart PostgreSQL
docker-compose restart postgres

# Wait 10 seconds
timeout /t 10 /nobreak

# Check logs
docker-compose logs postgres
```

### Problem: LibreTranslate not responding
**Solution:**
```bash
# Restart LibreTranslate
docker-compose restart libretranslate

# Wait 30 seconds (LibreTranslate takes time to load)
timeout /t 30 /nobreak

# Test API
curl http://localhost:5555/languages
```

---

## 📋 First Time Setup

### Install Dependencies

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd backend
npm install
```

### Setup Database
```bash
cd backend
npm run db:migrate
npm run db:seed
```

### Create Super Admin Account
```bash
cd backend
node scripts/create-admin.js
```

---

## 🎯 Default Login Credentials

After running seed script:

- **Username:** `admin`
- **Password:** `admin123`
- **Role:** Super Admin

⚠️ **Change password immediately after first login!**

---

## 📚 Additional Documentation

- **Migration Guide:** `MIGRATION-GUIDE.md`
- **Auto-Translation:** `AUTO-TRANSLATION-GUIDE.md`
- **Migration Execution:** `MIGRATION-EXECUTION-PLAN.md`
- **Full Documentation:** `qcollector.md`

---

**Ready to start?** Run `START-APP.bat`! 🚀
