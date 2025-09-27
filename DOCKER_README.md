# Form Builder - Docker Setup Guide

## 🐳 Docker Environment Overview

This project includes a complete Docker setup for both development and production environments with the following features:

- **Multi-stage Production Build**: Optimized React build with Nginx
- **Development Environment**: Hot-reload enabled development server
- **Thai Font Support**: Integrated ThaiSans Neue font in containers
- **Health Checks**: Built-in container health monitoring
- **Security Headers**: Production-ready Nginx configuration
- **Gzip Compression**: Optimized asset delivery

## 📋 Prerequisites

### Install Docker
- **Windows**: [Docker Desktop for Windows](https://docs.docker.com/desktop/windows/install/)
- **macOS**: [Docker Desktop for Mac](https://docs.docker.com/desktop/mac/install/)
- **Linux**: [Docker Engine](https://docs.docker.com/engine/install/)

### Verify Installation
```bash
docker --version
docker-compose --version
```

## 🚀 Quick Start

### Development Environment
```bash
# Build and start development container
./docker-scripts.sh dev-build
./docker-scripts.sh dev-up

# Or for Windows
docker-scripts.bat dev-build
docker-scripts.bat dev-up

# Access application
http://localhost:3000
```

### Production Environment
```bash
# Build and start production container
./docker-scripts.sh prod-build
./docker-scripts.sh prod-up

# Or for Windows
docker-scripts.bat prod-build
docker-scripts.bat prod-up

# Access application
http://localhost:8080
```

## 📝 Available Commands

### Development Commands
```bash
# Linux/macOS
./docker-scripts.sh dev-build    # Build development container
./docker-scripts.sh dev-up       # Start development environment
./docker-scripts.sh dev-down     # Stop development environment
./docker-scripts.sh dev-logs     # Show development logs

# Windows
docker-scripts.bat dev-build     # Build development container
docker-scripts.bat dev-up        # Start development environment
docker-scripts.bat dev-down      # Stop development environment
docker-scripts.bat dev-logs      # Show development logs
```

### Production Commands
```bash
# Linux/macOS
./docker-scripts.sh prod-build   # Build production container
./docker-scripts.sh prod-up      # Start production environment
./docker-scripts.sh prod-down    # Stop production environment
./docker-scripts.sh prod-logs    # Show production logs

# Windows
docker-scripts.bat prod-build    # Build production container
docker-scripts.bat prod-up       # Start production environment
docker-scripts.bat prod-down     # Stop production environment
docker-scripts.bat prod-logs     # Show production logs
```

### Utility Commands
```bash
# Linux/macOS
./docker-scripts.sh status       # Show containers status
./docker-scripts.sh clean        # Clean up Docker resources
./docker-scripts.sh help         # Show help

# Windows
docker-scripts.bat status        # Show containers status
docker-scripts.bat clean         # Clean up Docker resources
docker-scripts.bat help          # Show help
```

## 🏗️ Docker Architecture

### Development Setup (`Dockerfile.dev`)
- **Base Image**: `node:18-alpine`
- **Port**: `3000`
- **Features**:
  - Hot-reload enabled
  - Volume mounting for real-time code changes
  - Development dependencies included
  - Health checks enabled

### Production Setup (`Dockerfile`)
- **Multi-stage Build**:
  - **Stage 1**: Node.js build environment
  - **Stage 2**: Nginx production server
- **Port**: `80` (exposed as `8080`)
- **Features**:
  - Optimized production build
  - Nginx with security headers
  - Gzip compression
  - Static asset caching
  - ThaiSans Neue font support

## 📁 Docker Files Structure
```
├── Dockerfile              # Production multi-stage build
├── Dockerfile.dev          # Development environment
├── docker-compose.yml      # Docker Compose configuration
├── nginx.conf              # Nginx configuration for production
├── .dockerignore           # Files to exclude from Docker build
├── docker-scripts.sh       # Management scripts (Linux/macOS)
├── docker-scripts.bat      # Management scripts (Windows)
└── DOCKER_README.md        # This documentation
```

## 🛠️ Manual Docker Commands

If you prefer manual control over the scripts:

### Development
```bash
# Build development image
docker-compose --profile dev build

# Start development environment
docker-compose --profile dev up -d

# View logs
docker-compose --profile dev logs -f

# Stop environment
docker-compose --profile dev down
```

### Production
```bash
# Build production image
docker-compose --profile prod build

# Start production environment
docker-compose --profile prod up -d

# View logs
docker-compose --profile prod logs -f

# Stop environment
docker-compose --profile prod down
```

## 🔍 Health Checks

Both development and production containers include health checks:

- **Development**: `http://localhost:3000`
- **Production**: `http://localhost:80` (internal)

Check container health:
```bash
docker-compose ps
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
netstat -tulpn | grep :3000  # Linux/macOS
netstat -ano | findstr :3000 # Windows

# Stop existing containers
docker-compose down
```

### Build Issues
```bash
# Clean build cache
docker builder prune

# Rebuild without cache
docker-compose build --no-cache
```

### Container Issues
```bash
# View container logs
docker-compose logs [service-name]

# Restart containers
docker-compose restart

# Clean up everything
./docker-scripts.sh clean
```

### Permission Issues (Linux/macOS)
```bash
# Make scripts executable
chmod +x docker-scripts.sh

# Fix volume permissions
sudo chown -R $USER:$USER .
```

## 📊 Performance Tips

### Development
- Use volume mounting for faster file changes
- Enable Docker Desktop file sharing optimization
- Allocate sufficient memory to Docker Desktop (4GB+)

### Production
- Multi-stage builds reduce final image size
- Nginx serves static files efficiently
- Gzip compression reduces bandwidth usage
- Static asset caching improves performance

## 🔧 Customization

### Environment Variables
Add environment variables in `docker-compose.yml`:
```yaml
environment:
  - NODE_ENV=production
  - CUSTOM_VAR=value
```

### Port Changes
Modify ports in `docker-compose.yml`:
```yaml
ports:
  - "8080:80"  # host:container
```

### Nginx Configuration
Customize `nginx.conf` for:
- Additional security headers
- API proxy configuration
- Custom caching rules
- SSL/HTTPS setup

## 📈 Deployment

### Production Deployment
1. Build production image
2. Push to container registry
3. Deploy to production environment
4. Configure reverse proxy/load balancer
5. Set up SSL certificates
6. Configure monitoring and logging

### Container Registry
```bash
# Tag image
docker tag form-builder:latest your-registry/form-builder:latest

# Push to registry
docker push your-registry/form-builder:latest
```

## 🎯 Best Practices

1. **Use .dockerignore** - Exclude unnecessary files
2. **Multi-stage builds** - Minimize production image size
3. **Health checks** - Monitor container health
4. **Security headers** - Protect against common attacks
5. **Static asset caching** - Improve performance
6. **Log management** - Configure proper logging
7. **Resource limits** - Set memory/CPU limits in production
8. **Regular updates** - Keep base images updated

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)
- [React Production Build Guide](https://create-react-app.dev/docs/production-build/)

---

สำหรับข้อมูลเพิ่มเติมหรือปัญหาใดๆ กับการใช้งาน Docker กับ Form Builder นี้ กรุณาติดต่อทีมพัฒนา