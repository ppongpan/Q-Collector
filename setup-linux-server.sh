#!/bin/bash
# Q-Collector Linux Server Setup Script
# Version: 0.7.3-dev
# Platform: Ubuntu 20.04+ / Debian 11+

set -e  # Exit on error

echo "=========================================="
echo "Q-Collector Linux Server Setup"
echo "Version: 0.7.3-dev"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running on Linux
if [[ "$(uname)" != "Linux" ]]; then
    echo -e "${RED}❌ This script must run on Linux${NC}"
    exit 1
fi

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${YELLOW}⚠️  This script should not be run as root${NC}"
   echo "Please run as normal user with sudo privileges"
   exit 1
fi

echo -e "${BLUE}Step 1: System Update${NC}"
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git vim wget ufw netstat net-tools

echo ""
echo -e "${BLUE}Step 2: Install Docker${NC}"
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker already installed${NC}"
    docker --version
else
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✅ Docker installed${NC}"
fi

echo ""
echo -e "${BLUE}Step 3: Configure Firewall${NC}"
sudo ufw --force enable
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 3000/tcp # Frontend
sudo ufw allow 5000/tcp # Backend
sudo ufw allow 5555/tcp # Argos
echo -e "${GREEN}✅ Firewall configured${NC}"

echo ""
echo -e "${BLUE}Step 4: Get Server IP${NC}"
SERVER_IP=$(curl -s ifconfig.me)
echo -e "${GREEN}Server IP: $SERVER_IP${NC}"

echo ""
echo -e "${BLUE}Step 5: Generate Secrets${NC}"
JWT_SECRET=$(openssl rand -hex 64)
ENCRYPTION_KEY=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
MINIO_PASSWORD=$(openssl rand -base64 32)
echo -e "${GREEN}✅ Secrets generated${NC}"

echo ""
echo -e "${BLUE}Step 6: Create .env file${NC}"
cat > .env.production << EOF
# Generated on $(date)
# Server IP: $SERVER_IP

# Frontend
PORT=3000
REACT_APP_API_URL=http://$SERVER_IP:5000/api/v1
REACT_APP_ENV=production

# PostgreSQL
POSTGRES_USER=qcollector
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=qcollector_db
POSTGRES_PORT=5432

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=$MINIO_PASSWORD
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001

# Redis
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_PORT=6379

# Backend
NODE_ENV=production
API_PORT=5000

# Security
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
CORS_ORIGIN=http://$SERVER_IP:3000

# Argos Translate
TRANSLATION_API_URL=http://argos-translate:5000
ARGOS_PORT=5555

# Logging
LOG_LEVEL=info
EOF

echo -e "${GREEN}✅ .env.production created${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Copy this project to server"
echo "2. Copy .env.production to .env"
echo "3. Run: docker compose build"
echo "4. Run: docker compose up -d"
echo ""
echo "Important credentials:"
echo -e "${YELLOW}PostgreSQL Password: $POSTGRES_PASSWORD${NC}"
echo -e "${YELLOW}Redis Password: $REDIS_PASSWORD${NC}"
echo -e "${YELLOW}MinIO Password: $MINIO_PASSWORD${NC}"
echo ""
echo "Save these passwords securely!"
echo ""
