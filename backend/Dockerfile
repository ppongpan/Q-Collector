# ============================================
# Q-Collector Backend Dockerfile
# Node.js 20 Multi-Stage Build
# ============================================

# ============================================
# Stage 1: Base Image
# ============================================
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    curl \
    tini

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# ============================================
# Stage 2: Dependencies (Development)
# ============================================
FROM base AS dependencies-dev

# Install all dependencies (including devDependencies)
RUN npm ci

# ============================================
# Stage 3: Dependencies (Production)
# ============================================
FROM base AS dependencies-prod

# Install only production dependencies
RUN npm ci --only=production

# ============================================
# Stage 4: Development
# ============================================
FROM base AS development

# Install development dependencies
COPY --from=dependencies-dev /app/node_modules ./node_modules

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs && \
    chown -R node:node /app

# Switch to non-root user
USER node

# Expose port
EXPOSE 5000

# Use tini as init process
ENTRYPOINT ["/sbin/tini", "--"]

# Start development server with nodemon
CMD ["npm", "run", "dev"]

# ============================================
# Stage 5: Builder (Production)
# ============================================
FROM base AS builder

# Install production dependencies
COPY --from=dependencies-prod /app/node_modules ./node_modules

# Copy application code
COPY . .

# Run any build steps if needed (e.g., TypeScript compilation)
# RUN npm run build

# ============================================
# Stage 6: Production
# ============================================
FROM node:20-alpine AS production

# Install system dependencies and dumb-init
RUN apk add --no-cache \
    curl \
    tini

# Set working directory
WORKDIR /app

# Copy production dependencies
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY --from=builder /app .

# Create logs directory with proper permissions
RUN mkdir -p logs && \
    chown -R node:node /app

# Switch to non-root user
USER node

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Use tini as init process
ENTRYPOINT ["/sbin/tini", "--"]

# Start production server
CMD ["node", "api/server.js"]

# ============================================
# Metadata
# ============================================
LABEL maintainer="Q-Collector Team"
LABEL version="0.4.0"
LABEL description="Q-Collector Backend API Server"