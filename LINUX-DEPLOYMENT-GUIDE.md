# คู่มือ Deploy Q-Collector บน Linux Server

**Version:** 0.7.3-dev
**Platform:** Ubuntu 20.04+ / Debian 11+
**Date:** 2025-10-05

---

## 🎯 ภาพรวม

คู่มือนี้จะแนะนำวิธีการ deploy Q-Collector ทั้งระบบบน Linux Server พร้อม Argos Translate

**สิ่งที่จะได้:**
- ✅ Q-Collector Backend API (Node.js)
- ✅ Q-Collector Frontend (React)
- ✅ PostgreSQL Database
- ✅ Redis Cache
- ✅ MinIO File Storage
- ✅ Argos Translate Service (Thai-English)

---

## 📋 ข้อกำหนด

### Hardware
- **CPU:** 2+ cores
- **RAM:** 4GB+ (8GB แนะนำ)
- **Disk:** 20GB+ available
- **Network:** Internet connection

### Software
- **OS:** Ubuntu 20.04+, Debian 11+, or CentOS 8+
- **Docker:** 24.0+
- **Docker Compose:** 2.0+
- **Git:** Latest version

---

## 🚀 ขั้นตอนที่ 1: เตรียม Server

### 1.1 Update System
```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl git vim wget ufw
```

### 1.2 Install Docker
```bash
# Remove old versions
sudo apt remove docker docker-engine docker.io containerd runc

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

### 1.3 Configure Firewall
```bash
# Enable UFW
sudo ufw enable

# Allow SSH (important!)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow application ports
sudo ufw allow 3000/tcp  # Frontend
sudo ufw allow 5000/tcp  # Backend API
sudo ufw allow 5555/tcp  # Argos Translate

# Check status
sudo ufw status
```

---

## 📦 ขั้นตอนที่ 2: Clone Project

```bash
# Create project directory
mkdir -p ~/projects
cd ~/projects

# Clone repository (แทนที่ URL ของคุณ)
git clone <YOUR_REPO_URL> q-collector
cd q-collector

# Check files
ls -la
```

---

## ⚙️ ขั้นตอนที่ 3: Configuration

### 3.1 สร้าง Environment Files

**ไฟล์ `.env` (root):**
```bash
cat > .env << 'EOF'
# Frontend Configuration
PORT=3000
REACT_APP_API_URL=http://YOUR_SERVER_IP:5000/api/v1
REACT_APP_ENV=production

# PostgreSQL Configuration
POSTGRES_USER=qcollector
POSTGRES_PASSWORD=CHANGE_THIS_PASSWORD_STRONG_123
POSTGRES_DB=qcollector_db
POSTGRES_PORT=5432

# MinIO Configuration
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=CHANGE_THIS_MINIO_PASSWORD_456
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_USE_SSL=false
MINIO_BUCKET=qcollector

# Redis Configuration
REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD_789
REDIS_PORT=6379

# API Backend Configuration
NODE_ENV=production
API_PORT=5000
DB_AUTO_SYNC=false

# Security Keys (สร้างใหม่ทุกครั้ง!)
JWT_SECRET=$(openssl rand -hex 64)
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_KEY=$(openssl rand -hex 32)

# CORS Configuration
CORS_ORIGIN=http://YOUR_SERVER_IP:3000

# Logging
LOG_LEVEL=info

# Argos Translate Configuration
TRANSLATION_API_URL=http://argos-translate:5000
ARGOS_PORT=5555

# Telegram Bot (Optional)
TELEGRAM_BOT_TOKEN=your-bot-token-here
TELEGRAM_GROUP_ID=your-group-id-here

# Email Service (Optional)
ENABLE_EMAIL_SERVICE=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EOF

# แทนที่ YOUR_SERVER_IP ด้วย IP จริง
SERVER_IP=$(curl -s ifconfig.me)
sed -i "s/YOUR_SERVER_IP/$SERVER_IP/g" .env
```

**ไฟล์ `backend/.env`:**
```bash
# Copy from root .env
cp .env backend/.env

# Add backend-specific configs
cat >> backend/.env << 'EOF'

# Background Processing
ENABLE_QUEUE_SERVICE=true
REDIS_QUEUE_DB=1

# File Processing
TEMP_DIR=./temp
UPLOAD_MAX_SIZE=10485760
IMAGE_QUALITY=85

# Export Configuration
EXPORT_DIR=./exports
EXPORT_RETENTION_DAYS=7

# Backup Configuration
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=30
EOF
```

### 3.2 ตรวจสอบ Configuration
```bash
# ตรวจสอบว่ามี .env ทุกที่ที่จำเป็น
ls -la .env backend/.env

# ตรวจสอบ docker-compose.yml
cat docker-compose.yml | grep -A5 "argos-translate:"
```

---

## 🐳 ขั้นตอนที่ 4: Build และ Deploy

### 4.1 Build All Images
```bash
# Build ทุก service (ใช้เวลา 10-15 นาที)
docker compose build

# ตรวจสอบ images
docker images | grep qcollector
```

### 4.2 Start Services
```bash
# Start ทุก service
docker compose up -d

# ตรวจสอบ status
docker compose ps

# ดู logs
docker compose logs -f
```

### 4.3 รอ Services พร้อม
```bash
# รอประมาณ 2-3 นาที สำหรับ:
# - PostgreSQL initialization
# - Argos models download (~2GB)
# - Backend initialization

# ตรวจสอบ Argos Translate (ต้องรอนานสุด)
docker logs -f qcollector_argos

# รอจนเห็น: "✅ Server ready on port 5000"
```

---

## ✅ ขั้นตอนที่ 5: Verification

### 5.1 Health Checks
```bash
# PostgreSQL
docker exec qcollector_postgres pg_isready -U qcollector

# Redis
docker exec qcollector_redis redis-cli -a REDIS_PASSWORD ping

# MinIO
curl http://localhost:9000/minio/health/live

# Argos Translate (สำคัญที่สุด!)
curl http://localhost:5555/health

# Backend API
curl http://localhost:5000/health

# Frontend
curl http://localhost:3000
```

### 5.2 ทดสอบ Argos Translation
```bash
curl -X POST http://localhost:5555/translate \
  -H "Content-Type: application/json" \
  -d '{"q":"แบบฟอร์มทดสอบ","source":"th","target":"en"}'

# Expected: {"translatedText":"test form",...}
```

---

## 🔧 ขั้นตอนที่ 6: Database Setup

### 6.1 Run Migrations
```bash
# เข้าไปใน backend container
docker exec -it qcollector_api bash

# รัน migrations
npm run db:migrate

# (Optional) Seed initial data
npm run db:seed

# Exit container
exit
```

### 6.2 สร้าง Super Admin
```bash
# ใช้ script สร้าง admin user
docker exec -it qcollector_api node backend/scripts/create-super-admin.js
```

---

## 🔄 ขั้นตอนที่ 7: Migrate ข้อมูลเดิม (Optional)

### 7.1 Export จาก Windows/WSL2
```bash
# บนเครื่อง Windows/WSL2
pg_dump -U qcollector -d qcollector_db > qcollector_backup.sql

# Copy ไฟล์ไปที่ Linux server (ใช้ scp หรือ SFTP)
scp qcollector_backup.sql user@linux-server:~/
```

### 7.2 Import บน Linux
```bash
# บน Linux server
docker exec -i qcollector_postgres psql -U qcollector -d qcollector_db < ~/qcollector_backup.sql
```

### 7.3 Migrate Table Names
```bash
# รัน migration script
docker exec -it qcollector_api node backend/scripts/migrate-table-names-to-english.js

# ตรวจสอบ report
cat migration-report-*.json
```

---

## 🌐 ขั้นตอนที่ 8: Setup Nginx Reverse Proxy (Production)

### 8.1 Install Nginx
```bash
sudo apt install -y nginx
```

### 8.2 Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/qcollector

# เพิ่มเนื้อหา:
server {
    listen 80;
    server_name YOUR_DOMAIN.com;  # แทนที่ด้วย domain จริง

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
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # MinIO Console
    location /minio/ {
        proxy_pass http://localhost:9001/;
        proxy_set_header Host $host;
    }

    client_max_body_size 10M;
}
```

### 8.3 Enable Site
```bash
# Enable configuration
sudo ln -s /etc/nginx/sites-available/qcollector /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 8.4 Setup SSL (Let's Encrypt)
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d YOUR_DOMAIN.com

# Auto-renewal test
sudo certbot renew --dry-run
```

---

## 📊 ขั้นตอนที่ 9: Monitoring & Maintenance

### 9.1 ดู Logs
```bash
# ทุก services
docker compose logs -f

# Service เฉพาะ
docker compose logs -f api
docker compose logs -f argos-translate
docker compose logs -f postgres

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 9.2 Monitor Resources
```bash
# Container stats
docker stats

# Disk usage
df -h
docker system df

# Memory usage
free -h
```

### 9.3 Backup
```bash
# สร้าง backup script
cat > ~/backup-qcollector.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/backups
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec qcollector_postgres pg_dump -U qcollector qcollector_db \
  > $BACKUP_DIR/qcollector_db_$DATE.sql

# Backup MinIO data
docker exec qcollector_minio mc mirror /data $BACKUP_DIR/minio_$DATE

# Compress
tar -czf $BACKUP_DIR/qcollector_backup_$DATE.tar.gz \
  $BACKUP_DIR/*_$DATE* \
  ~/projects/q-collector/.env \
  ~/projects/q-collector/backend/.env

# Keep last 7 days only
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: qcollector_backup_$DATE.tar.gz"
EOF

chmod +x ~/backup-qcollector.sh

# Schedule daily backup (3 AM)
(crontab -l 2>/dev/null; echo "0 3 * * * ~/backup-qcollector.sh") | crontab -
```

---

## 🔄 ขั้นตอนที่ 10: Update & Maintenance

### 10.1 Update Application
```bash
cd ~/projects/q-collector

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose build
docker compose up -d

# Run migrations if needed
docker exec -it qcollector_api npm run db:migrate
```

### 10.2 Restart Services
```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart api
docker compose restart argos-translate
```

### 10.3 View Service Status
```bash
# Check all services
docker compose ps

# Check specific service logs
docker compose logs --tail=100 api
```

---

## 🐛 Troubleshooting

### ปัญหา 1: Argos Translate ไม่ start
```bash
# ตรวจสอบ logs
docker logs qcollector_argos

# ถ้าเจอ "Model not found"
docker exec -it qcollector_argos python /app/install-argos-models.py
docker restart qcollector_argos
```

### ปัญหา 2: Backend ไม่เชื่อมต่อ PostgreSQL
```bash
# ตรวจสอบ PostgreSQL
docker exec qcollector_postgres psql -U qcollector -d qcollector_db -c "SELECT 1;"

# ตรวจสอบ connection string
docker exec qcollector_api env | grep POSTGRES
```

### ปัญหา 3: Port ชนกัน
```bash
# ตรวจสอบ ports ที่ใช้งานอยู่
sudo netstat -tulpn | grep LISTEN

# แก้ไข port ใน .env
nano .env

# Restart
docker compose down
docker compose up -d
```

### ปัญหา 4: Disk เต็ม
```bash
# ลบ unused images
docker image prune -a

# ลบ unused volumes
docker volume prune

# ลบ unused containers
docker container prune

# ทำความสะอาดทั้งหมด (ระวัง!)
docker system prune -a --volumes
```

---

## 📋 Checklist การ Deploy

- [ ] Update Ubuntu/Debian
- [ ] Install Docker & Docker Compose
- [ ] Configure firewall (UFW)
- [ ] Clone project
- [ ] สร้าง .env files (แก้ passwords!)
- [ ] Build Docker images
- [ ] Start all services
- [ ] รอ Argos models download
- [ ] Verify health checks
- [ ] Test Argos translation
- [ ] Run database migrations
- [ ] สร้าง super admin user
- [ ] (Optional) Migrate ข้อมูลเดิม
- [ ] Setup Nginx reverse proxy
- [ ] Setup SSL certificate
- [ ] ทดสอบการใช้งาน
- [ ] Setup backup cron job
- [ ] Monitor resources

---

## 🎯 Next Steps หลัง Deploy

1. **ทดสอบ E2E:**
   - สร้างฟอร์มใหม่ (ภาษาไทย)
   - ตรวจสอบ table name ใน PostgreSQL
   - Submit ข้อมูล
   - แก้ไขข้อมูล

2. **Monitor Performance:**
   - CPU/Memory usage
   - API response times
   - Argos translation speed

3. **Optimize:**
   - Adjust Docker memory limits
   - Configure Redis caching
   - Tune PostgreSQL

---

**Version:** 0.7.3-dev
**Last Updated:** 2025-10-05
**Platform:** Linux Production Ready ✅
