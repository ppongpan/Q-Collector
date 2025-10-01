# Q-Collector Installation & Deployment Guide

**คู่มือการติดตั้งและใช้งาน Q-Collector Application**

Version: 0.5.1
Last Updated: 2025-09-30

---

## 📋 Table of Contents

1. [System Requirements](#system-requirements)
2. [Installation Guide](#installation-guide)
3. [Configuration](#configuration)
4. [Running the Application](#running-the-application)
5. [Production Deployment](#production-deployment)
6. [Troubleshooting](#troubleshooting)

---

## 🖥️ System Requirements

### Minimum Requirements

**Hardware:**
- CPU: 2 cores
- RAM: 4 GB
- Storage: 20 GB free space

**Software:**
- Node.js: v20.0.0 or higher
- npm: v9.0.0 or higher
- PostgreSQL: v14 or higher
- Redis: v6 or higher
- MinIO: Latest version

**Operating System:**
- Ubuntu 20.04+ / Debian 11+
- CentOS 8+ / RHEL 8+
- Windows Server 2019+
- macOS 12+

---

## 📦 Installation Guide

### Step 1: Clone Repository

```bash
# Clone from GitHub
git clone https://github.com/ppongpan/Q-Collector.git
cd Q-Collector

# Or download and extract ZIP
wget https://github.com/ppongpan/Q-Collector/archive/refs/heads/main.zip
unzip main.zip
cd Q-Collector-main
```

### Step 2: Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### Step 3: Install Required Services

#### PostgreSQL Installation

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
```bash
# Download installer from https://www.postgresql.org/download/windows/
# Run installer and follow wizard
```

**Create Database:**
```bash
# Login to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE qcollector_dev;
CREATE USER qcollector_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE qcollector_dev TO qcollector_user;
\q
```

#### Redis Installation

**Ubuntu/Debian:**
```bash
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**Windows:**
```bash
# Download Redis from https://github.com/microsoftarchive/redis/releases
# Or use WSL2 with Ubuntu
```

#### MinIO Installation

**Linux:**
```bash
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
sudo mv minio /usr/local/bin/

# Create directories
sudo mkdir -p /mnt/data/minio
sudo mkdir -p /etc/minio

# Create systemd service
sudo nano /etc/systemd/system/minio.service
```

**MinIO Service File:**
```ini
[Unit]
Description=MinIO
Documentation=https://docs.min.io
Wants=network-online.target
After=network-online.target

[Service]
User=minio-user
Group=minio-user
Environment="MINIO_ROOT_USER=minioadmin"
Environment="MINIO_ROOT_PASSWORD=minioadmin123"
ExecStart=/usr/local/bin/minio server /mnt/data/minio --console-address ":9001"
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Create user and set permissions
sudo useradd -r minio-user -s /sbin/nologin
sudo chown minio-user:minio-user /mnt/data/minio

# Start MinIO
sudo systemctl daemon-reload
sudo systemctl start minio
sudo systemctl enable minio
```

**Windows:**
```bash
# Download MinIO from https://dl.min.io/server/minio/release/windows-amd64/minio.exe
# Run: minio.exe server D:\minio-data --console-address ":9001"
```

---

## ⚙️ Configuration

### Step 1: Create Environment Files

**Frontend (.env):**
```bash
# Copy example file
cp .env.example .env

# Edit configuration
nano .env
```

```env
# Frontend Configuration
REACT_APP_API_URL=http://localhost:5000/api/v1
REACT_APP_WS_URL=http://localhost:5000
REACT_APP_TELEGRAM_BOT_TOKEN=your_telegram_bot_token
REACT_APP_TELEGRAM_GROUP_ID=your_telegram_group_id
```

**Backend (.env):**
```bash
cd backend
cp .env.example .env
nano .env
```

```env
# Server Configuration
NODE_ENV=development
PORT=5000
HOST=0.0.0.0

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=qcollector_dev
DB_USER=qcollector_user
DB_PASSWORD=your_secure_password
DB_DIALECT=postgres
DB_LOGGING=false

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET_NAME=qcollector

# JWT Configuration
JWT_SECRET=your_very_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_token_secret
JWT_REFRESH_EXPIRES_IN=30d

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=Q-Collector <noreply@qcollector.com>

# Telegram Configuration
TELEGRAM_BOT_TOKEN=7794493324:AAHlxtpYenok1kwyo88ns5R4rivWWXcqmE0
TELEGRAM_GROUP_ID=-4847325737

# Security
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Step 2: Database Setup

```bash
cd backend

# Run migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed

# Or reset database
npm run db:reset
```

### Step 3: Create Super Admin

```bash
cd backend
node scripts/create-super-admin.js
```

**Follow prompts:**
- Username: `pongpanp`
- Full Name: `Pongpan Peerawanichkul`
- Email: `admin@example.com`
- Password: `[secure password]`
- Department: `Technic`
- Role: `Super Admin`

---

## 🚀 Running the Application

### Development Mode

**Option 1: Run Separately**

```bash
# Terminal 1: Start Backend
cd backend
npm run dev

# Terminal 2: Start Frontend
npm start
```

**Option 2: Run Concurrently**

```bash
# Install concurrently (if not installed)
npm install -g concurrently

# Run both frontend and backend
concurrently "npm start" "cd backend && npm run dev"
```

**Access Application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Docs: http://localhost:5000/api-docs
- MinIO Console: http://localhost:9001

### Production Mode

**Option 1: Using PM2 (Recommended)**

```bash
# Install PM2 globally
npm install -g pm2

# Build frontend
npm run build

# Start backend with PM2
cd backend
pm2 start api/server.js --name qcollector-backend

# Serve frontend with PM2
pm2 serve ../build 3000 --name qcollector-frontend --spa

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

**PM2 Commands:**
```bash
pm2 status              # Check status
pm2 logs qcollector-backend   # View logs
pm2 restart qcollector-backend # Restart
pm2 stop qcollector-backend    # Stop
pm2 delete qcollector-backend  # Remove
```

**Option 2: Using systemd**

**Backend Service (/etc/systemd/system/qcollector-backend.service):**
```ini
[Unit]
Description=Q-Collector Backend API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/qcollector/backend
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node api/server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Frontend Service (/etc/systemd/system/qcollector-frontend.service):**
```ini
[Unit]
Description=Q-Collector Frontend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/qcollector
ExecStart=/usr/bin/npx serve -s build -l 3000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start services
sudo systemctl daemon-reload
sudo systemctl enable qcollector-backend
sudo systemctl enable qcollector-frontend
sudo systemctl start qcollector-backend
sudo systemctl start qcollector-frontend

# Check status
sudo systemctl status qcollector-backend
sudo systemctl status qcollector-frontend
```

**Option 3: Using Docker**

**Create docker-compose.yml:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: qcollector_dev
      POSTGRES_USER: qcollector_user
      POSTGRES_PASSWORD: your_secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      REDIS_HOST: redis
      MINIO_ENDPOINT: minio
    depends_on:
      - postgres
      - redis
      - minio
    ports:
      - "5000:5000"

  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    depends_on:
      - backend
    ports:
      - "3000:3000"

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

---

## 🌐 Production Deployment

### Using Nginx as Reverse Proxy

**Install Nginx:**
```bash
sudo apt install nginx
```

**Configuration (/etc/nginx/sites-available/qcollector):**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # File size limit
    client_max_body_size 10M;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/qcollector /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL/HTTPS with Let's Encrypt

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
sudo certbot renew --dry-run
```

---

## 🔧 Troubleshooting

### Common Issues

**1. Port Already in Use**
```bash
# Find process using port 3000
sudo lsof -i :3000
# Or on Windows
netstat -ano | findstr :3000

# Kill process
kill -9 <PID>
# Or on Windows
taskkill /PID <PID> /F
```

**2. Database Connection Failed**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U qcollector_user -d qcollector_dev

# Check logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

**3. Redis Connection Failed**
```bash
# Check Redis status
sudo systemctl status redis-server

# Test connection
redis-cli ping

# Check logs
sudo tail -f /var/log/redis/redis-server.log
```

**4. MinIO Connection Failed**
```bash
# Check MinIO status
sudo systemctl status minio

# Test connection
curl http://localhost:9000/minio/health/live

# Access console
http://localhost:9001
```

**5. Permission Issues**
```bash
# Fix file permissions
sudo chown -R www-data:www-data /var/www/qcollector
sudo chmod -R 755 /var/www/qcollector

# Fix node_modules
sudo chown -R $USER:$USER node_modules
```

**6. Build Errors**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Clear React cache
rm -rf build
npm run build
```

### Logs Location

**Application Logs:**
- Backend: `backend/logs/`
- PM2 Logs: `~/.pm2/logs/`
- Systemd Logs: `sudo journalctl -u qcollector-backend`

**Service Logs:**
- PostgreSQL: `/var/log/postgresql/`
- Redis: `/var/log/redis/`
- Nginx: `/var/log/nginx/`

**View Logs:**
```bash
# Backend logs
tail -f backend/logs/combined.log

# PM2 logs
pm2 logs qcollector-backend

# Systemd logs
sudo journalctl -u qcollector-backend -f
```

---

## 📊 Monitoring

### Health Check Endpoints

```bash
# Backend health
curl http://localhost:5000/health

# Database health
curl http://localhost:5000/api/v1/health/db

# Redis health
curl http://localhost:5000/api/v1/health/redis

# MinIO health
curl http://localhost:9000/minio/health/live
```

### Performance Monitoring

**PM2 Monitoring:**
```bash
pm2 monit
```

**System Monitoring:**
```bash
# Install htop
sudo apt install htop
htop

# Install ctop (Docker)
sudo wget https://github.com/bcicen/ctop/releases/download/v0.7.7/ctop-0.7.7-linux-amd64 -O /usr/local/bin/ctop
sudo chmod +x /usr/local/bin/ctop
ctop
```

---

## 🔐 Security Best Practices

1. **Change Default Passwords:**
   - Database password
   - Redis password (if enabled)
   - MinIO credentials
   - JWT secrets

2. **Enable Firewall:**
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

3. **Regular Updates:**
```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update npm packages
npm update
cd backend && npm update
```

4. **Backup Strategy:**
```bash
# Database backup
pg_dump -U qcollector_user qcollector_dev > backup_$(date +%Y%m%d).sql

# File backup
tar -czf backup_$(date +%Y%m%d).tar.gz /var/www/qcollector
```

5. **Environment Variables:**
   - Never commit `.env` files to Git
   - Use strong, unique secrets
   - Rotate secrets regularly

---

## 📞 Support

**Documentation:**
- Application Docs: `qcollector.md`
- API Documentation: http://localhost:5000/api-docs

**Contact:**
- Email: admin@example.com
- GitHub Issues: https://github.com/ppongpan/Q-Collector/issues

---

**Q-Collector v0.5.1**
**Enterprise Form Builder & Data Collection System**
**© 2025 Q-Collector Team**
