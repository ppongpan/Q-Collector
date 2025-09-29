# Q-Collector Docker Infrastructure Setup

## Overview

Docker Compose setup สำหรับ Q-Collector v0.2 ประกอบด้วย PostgreSQL, MinIO, Redis และ PgAdmin สำหรับการพัฒนา backend.

## Services Overview

### 🗄️ **PostgreSQL Database**
- **Image**: postgres:15-alpine
- **Port**: 5432
- **Database**: q_collector
- **User**: app_user
- **Password**: secure_q_collector_2024

### 📦 **MinIO Object Storage**
- **Image**: minio/minio:latest
- **API Port**: 9000
- **Console Port**: 9001
- **Access Key**: q_collector_admin
- **Secret Key**: secure_minio_password_2024
- **Default Buckets**: forms, submissions, uploads

### 🔄 **Redis Cache**
- **Image**: redis:7-alpine
- **Port**: 6379
- **Password**: redis_q_collector_2024

### 🛠️ **PgAdmin (Development)**
- **Image**: dpage/pgadmin4:latest
- **Port**: 8080
- **Email**: admin@q-collector.local
- **Password**: pgadmin_q_collector_2024

## Quick Start

### 1. เริ่มต้น Infrastructure Services

```bash
# Start database, storage, and cache services
docker-compose up -d postgresql minio redis

# Check services status
docker-compose ps
```

### 2. เริ่มต้น Development Environment

```bash
# Start with PgAdmin for database management
docker-compose --profile development up -d

# View logs
docker-compose logs -f postgresql minio redis
```

### 3. Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **MinIO Console** | http://localhost:9001 | q_collector_admin / secure_minio_password_2024 |
| **PgAdmin** | http://localhost:8080 | admin@q-collector.local / pgladmin_q_collector_2024 |
| **PostgreSQL** | localhost:5432 | app_user / secure_q_collector_2024 |
| **Redis** | localhost:6379 | Password: redis_q_collector_2024 |

## Database Setup

### 1. Initial Schema Creation

Database schema จะถูกสร้างอัตโนมัติจากไฟล์ `database/init/01-init-database.sql` เมื่อ PostgreSQL container เริ่มครั้งแรก.

### 2. Connect via PgAdmin

1. เข้า http://localhost:8080
2. Login ด้วย admin@q-collector.local / pgadmin_q_collector_2024
3. เพิ่ม Server ใหม่:
   - **Name**: Q-Collector DB
   - **Host**: postgresql
   - **Port**: 5432
   - **Database**: q_collector
   - **Username**: app_user
   - **Password**: secure_q_collector_2024

### 3. Database Schema

```
q_collector/
├── forms/                 # Form definitions
│   ├── forms             # Main forms
│   └── sub_forms         # Sub forms
├── submissions/          # Form submissions
│   ├── form_submissions  # Main submissions
│   └── sub_form_submissions # Sub form submissions
├── files/                # File management
│   └── uploaded_files    # File metadata
├── users/                # User management
│   ├── users            # User accounts
│   └── user_sessions    # Session management
└── settings/            # Application settings
    ├── app_settings     # General settings
    ├── telegram_settings # Telegram integration
    └── document_numbering # Document number generation
```

## MinIO Setup

### 1. Initial Buckets

Buckets จะถูกสร้างอัตโนมัติ:
- **forms**: Form templates และ configurations
- **submissions**: Submission exports และ reports
- **uploads**: User uploaded files

### 2. Access via Console

1. เข้า http://localhost:9001
2. Login ด้วย q_collector_admin / secure_minio_password_2024
3. ตรวจสอบ buckets และ configure policies

### 3. S3 Compatible API

```javascript
// Example connection configuration
const minioConfig = {
  endPoint: 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: 'q_collector_admin',
  secretKey: 'secure_minio_password_2024'
};
```

## Redis Setup

### 1. Connection Configuration

```javascript
// Redis connection for Node.js
const redisConfig = {
  host: 'localhost',
  port: 6379,
  password: 'redis_q_collector_2024',
  db: 0
};
```

### 2. Usage Patterns

- **Session Storage**: User sessions และ authentication tokens
- **Cache**: Form definitions และ frequently accessed data
- **Queue**: Background jobs และ notification queue

## Environment Variables

### Development Environment

```bash
DATABASE_URL=postgresql://app_user:secure_q_collector_2024@localhost:5432/q_collector
REDIS_URL=redis://:redis_q_collector_2024@localhost:6379
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=q_collector_admin
MINIO_SECRET_KEY=secure_minio_password_2024
MINIO_USE_SSL=false
```

### Production Environment

```bash
DATABASE_URL=postgresql://app_user:secure_q_collector_2024@postgresql:5432/q_collector
REDIS_URL=redis://:redis_q_collector_2024@redis:6379
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=q_collector_admin
MINIO_SECRET_KEY=secure_minio_password_2024
MINIO_USE_SSL=false
```

## Development Workflows

### 1. Frontend + Backend Development

```bash
# Start infrastructure
docker-compose up -d postgresql minio redis pgadmin

# Start frontend (local)
npm run dev

# Start backend API (when ready)
# npm run backend:dev
```

### 2. Full Stack with Docker

```bash
# Development mode with hot reload
docker-compose --profile dev up -d

# Production mode
docker-compose --profile prod up -d
```

### 3. Database Management

```bash
# Backup database
docker-compose exec postgresql pg_dump -U app_user q_collector > backup.sql

# Restore database
docker-compose exec -T postgresql psql -U app_user q_collector < backup.sql

# Reset database (WARNING: Deletes all data)
docker-compose down -v
docker-compose up -d postgresql
```

## Monitoring & Logs

### Health Checks

```bash
# Check all service health
docker-compose ps

# Detailed health check
docker-compose exec postgresql pg_isready -U app_user
docker-compose exec redis redis-cli --raw incr ping
curl http://localhost:9000/minio/health/live
```

### Log Monitoring

```bash
# View all logs
docker-compose logs -f

# Specific service logs
docker-compose logs -f postgresql
docker-compose logs -f minio
docker-compose logs -f redis
```

## Security Considerations

### 1. Password Security
- เปลี่ยน default passwords ก่อน production
- ใช้ environment variables สำหรับ credentials
- Enable SSL/TLS สำหรับ production

### 2. Network Security
- Services อยู่ใน isolated network (172.20.0.0/16)
- Database ไม่ expose port ใน production
- MinIO API ควรอยู่หลัง reverse proxy

### 3. Data Security
- Enable PostgreSQL encryption at rest
- Configure MinIO bucket policies
- Regular backup schedule

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check what's using port
   netstat -tulpn | grep :5432

   # Change ports in docker-compose.yml if needed
   ```

2. **Permission Issues**
   ```bash
   # Fix volume permissions
   sudo chown -R 999:999 ./database/data
   ```

3. **Database Connection Issues**
   ```bash
   # Test connection
   docker-compose exec postgresql psql -U app_user -d q_collector -c "SELECT 1;"
   ```

4. **MinIO Access Issues**
   ```bash
   # Check MinIO logs
   docker-compose logs minio

   # Test API access
   curl http://localhost:9000/minio/health/live
   ```

## Next Steps

1. **Backend API Development**
   - Express.js หรือ Fastify API server
   - Authentication & authorization
   - Form CRUD operations
   - File upload handling

2. **Integration Features**
   - Real-time notifications
   - Background job processing
   - Email integration
   - Advanced reporting

3. **Production Deployment**
   - SSL certificates
   - Load balancing
   - Monitoring & alerting
   - Backup automation

---

## Summary

Infrastructure นี้พร้อมสำหรับการพัฒนา backend API สำหรับ Q-Collector v0.2 โดยมี:

✅ **PostgreSQL**: สำหรับ relational data storage
✅ **MinIO**: สำหรับ file storage ที่ S3-compatible
✅ **Redis**: สำหรับ caching และ session management
✅ **PgAdmin**: สำหรับ database management
✅ **Health Checks**: สำหรับ monitoring service status
✅ **Network Isolation**: สำหรับ security

พร้อมเริ่มพัฒนา backend API และ integration กับ frontend ที่มีอยู่แล้ว!