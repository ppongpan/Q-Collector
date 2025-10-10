# 🐳 Argos Translate Docker Service

Thai-English translation service for Q-Collector using Argos Translate

## 📋 Prerequisites

- Docker Desktop installed (https://www.docker.com/products/docker-desktop/)
- At least 2GB RAM available
- At least 1GB disk space

## 🚀 Quick Start

### 1. Build the Docker Image

```bash
cd docker/argos-translate
docker build -t qcollector-argos-translate:1.0 .
```

**Note:** First build takes ~10-15 minutes (downloading models)

### 2. Run the Service

```bash
# Using docker-compose (recommended)
docker-compose up -d

# Or using docker run
docker run -d \
  --name qcollector-argos-translate \
  -p 8765:8765 \
  --restart unless-stopped \
  qcollector-argos-translate:1.0
```

### 3. Check Status

```bash
# View logs
docker logs -f qcollector-argos-translate

# Check health
curl http://localhost:8765/health
```

## 🧪 Testing

### Test Health Endpoint

```bash
curl http://localhost:8765/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "languages": ["th", "en"],
  "stats": {
    "total_requests": 0,
    "total_characters": 0,
    "average_time_ms": 0,
    "errors": 0
  }
}
```

### Test Translation

```bash
curl -X POST http://localhost:8765/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "แบบฟอร์มบันทึกข้อมูล"
  }'
```

**Expected Response:**
```json
{
  "original": "แบบฟอร์มบันทึกข้อมูล",
  "translated": "Data Recording Form",
  "from_lang": "th",
  "to_lang": "en",
  "success": true,
  "characters": 20,
  "time_ms": 245.5
}
```

### Test Batch Translation

```bash
curl -X POST http://localhost:8765/translate/batch \
  -H "Content-Type: application/json" \
  -d '{
    "texts": [
      "แบบฟอร์มบันทึกข้อมูล",
      "ชื่อเต็ม",
      "เบอร์โทรศัพท์"
    ]
  }'
```

## 📖 API Documentation

Once the service is running, visit:
- **Swagger UI**: http://localhost:8765/docs
- **ReDoc**: http://localhost:8765/redoc

## 🔧 Management Commands

### View Logs
```bash
docker logs -f qcollector-argos-translate
```

### Restart Service
```bash
docker-compose restart
```

### Stop Service
```bash
docker-compose down
```

### Stop and Remove Everything
```bash
docker-compose down -v  # Also removes volumes
```

### Update Service
```bash
# Rebuild image
docker-compose build --no-cache

# Restart with new image
docker-compose up -d
```

## 📊 Monitoring

### Check Stats
```bash
curl http://localhost:8765/stats
```

### Reset Stats
```bash
curl -X POST http://localhost:8765/reset-stats
```

## 🐛 Troubleshooting

### Service not starting?

1. **Check Docker is running**
   ```bash
   docker ps
   ```

2. **Check logs for errors**
   ```bash
   docker logs qcollector-argos-translate
   ```

3. **Port 8765 already in use?**
   ```bash
   # Windows
   netstat -ano | findstr :8765

   # Change port in docker-compose.yml
   ports:
     - "8766:8765"  # Use different external port
   ```

### Translation not working?

1. **Check model is loaded**
   ```bash
   curl http://localhost:8765/health
   ```
   Should show `"model_loaded": true`

2. **Check logs for errors**
   ```bash
   docker logs qcollector-argos-translate
   ```

3. **Rebuild with fresh models**
   ```bash
   docker-compose down -v
   docker-compose build --no-cache
   docker-compose up -d
   ```

### Slow performance?

- **CPU Usage**: Argos uses ~100% CPU during translation
- **Expected Time**: 200-500ms per translation
- **Batch Translation**: More efficient for multiple texts

## 🔐 Security Notes

- Service runs on localhost only by default
- No authentication required (internal service)
- For production: Add API key authentication
- For production: Use HTTPS reverse proxy (nginx)

## 📝 Environment Variables

Set in `docker-compose.yml` or `.env` file:

```yaml
environment:
  - ARGOS_DEVICE_TYPE=cpu          # or 'cuda' for GPU
  - PYTHONUNBUFFERED=1             # Show logs immediately
  - LOG_LEVEL=info                 # debug, info, warning, error
```

## 🚀 Production Deployment

### With Docker Swarm
```bash
docker stack deploy -c docker-compose.yml qcollector
```

### With Kubernetes
```bash
# Convert to k8s manifests
kompose convert -f docker-compose.yml

# Deploy
kubectl apply -f .
```

## 📦 Disk Space

- **Docker Image**: ~500MB
- **Translation Models**: ~200MB
- **Total**: ~700MB

To clean up old images:
```bash
docker system prune -a
```

## 🔄 Backup & Restore

### Backup Models
```bash
# Models are in Docker volume
docker run --rm \
  -v argos-translate_argos-models:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/argos-models-backup.tar.gz -C /data .
```

### Restore Models
```bash
docker run --rm \
  -v argos-translate_argos-models:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/argos-models-backup.tar.gz"
```

## 📚 Further Reading

- [Argos Translate Documentation](https://argos-translate.readthedocs.io/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Docker Documentation](https://docs.docker.com/)

## 🆘 Support

If you encounter issues:
1. Check logs: `docker logs qcollector-argos-translate`
2. Verify health: `curl http://localhost:8765/health`
3. Rebuild: `docker-compose build --no-cache && docker-compose up -d`

## 📄 License

Internal use - Q-Collector Team
