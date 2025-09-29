# Q-Collector Backend API v0.4.0

Enterprise-grade backend infrastructure for Q-Collector Form Builder & Data Collection System.

## Technology Stack

- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js 4.21+
- **Database**: PostgreSQL 16
- **ORM**: Sequelize 6.37+
- **Cache**: Redis 7
- **Object Storage**: MinIO (S3-compatible)
- **Authentication**: JWT with bcrypt
- **Logging**: Winston
- **Testing**: Jest + Supertest

## Project Structure

```
backend/
├── api/                      # API Gateway
│   ├── server.js            # Express server entry point
│   ├── app.js               # Express app configuration
│   └── routes/              # API routes (Phase 2)
├── config/                   # Configuration files
│   ├── app.config.js        # General app config
│   ├── database.config.js   # Sequelize configuration
│   ├── redis.config.js      # Redis client setup
│   └── minio.config.js      # MinIO client setup
├── middleware/               # Express middleware
│   ├── error.middleware.js  # Error handling
│   └── logging.middleware.js # Request logging
├── utils/                    # Utility functions
│   └── logger.util.js       # Winston logger
├── models/                   # Database models (Phase 2)
├── services/                 # Business logic (Phase 2)
├── migrations/               # Database migrations
├── seeders/                  # Database seeders
├── tests/                    # Test suite
├── docker/                   # Docker configuration
│   ├── postgres/
│   │   └── init.sql         # PostgreSQL initialization
│   └── nginx/
│       └── nginx.conf       # Nginx configuration
├── .env.example             # Environment variables template
├── .eslintrc.js             # ESLint configuration
├── .gitignore               # Git ignore rules
├── Dockerfile               # Multi-stage Docker build
└── package.json             # Dependencies
```

## Quick Start

### 1. Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)
- MinIO (or use Docker)

### 2. Installation

```bash
# Navigate to backend directory
cd backend

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env

# Install dependencies
npm install
```

### 3. Generate Security Keys

```bash
# Generate JWT secret (64 bytes)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate encryption key (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Update `.env` with these keys:
```
JWT_SECRET=<generated_jwt_secret>
ENCRYPTION_KEY=<generated_encryption_key>
```

### 4. Start with Docker Compose

```bash
# Start all services (from project root)
docker-compose up -d postgres redis minio

# Or start everything including API
docker-compose up -d
```

### 5. Start Development Server

```bash
# Run migrations (Phase 2)
npm run db:migrate

# Seed database (Phase 2)
npm run db:seed

# Start development server
npm run dev
```

The API will be available at `http://localhost:5000`

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests with coverage
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Lint code with ESLint
- `npm run lint:fix` - Fix linting errors
- `npm run db:migrate` - Run database migrations
- `npm run db:migrate:undo` - Rollback last migration
- `npm run db:seed` - Seed database
- `npm run db:seed:undo` - Undo all seeders
- `npm run db:reset` - Reset database (undo all, migrate, seed)

## Environment Variables

See `.env.example` for all available environment variables.

**Critical Variables:**
- `NODE_ENV` - Environment (development/production/test)
- `PORT` - API server port (default: 5000)
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret (REQUIRED)
- `ENCRYPTION_KEY` - Data encryption key (REQUIRED)

## API Endpoints

### Health Check
```
GET /health
```

### API Base
```
GET /api/v1
```

### Authentication (Phase 2)
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
```

### Forms (Phase 2)
```
GET    /api/v1/forms
POST   /api/v1/forms
GET    /api/v1/forms/:id
PUT    /api/v1/forms/:id
DELETE /api/v1/forms/:id
```

### Submissions (Phase 3)
```
GET    /api/v1/submissions
POST   /api/v1/submissions
GET    /api/v1/submissions/:id
PUT    /api/v1/submissions/:id
DELETE /api/v1/submissions/:id
```

### Files (Phase 3)
```
POST   /api/v1/files/upload
GET    /api/v1/files/:id/download
DELETE /api/v1/files/:id
```

## Database Schema

The database uses PostgreSQL with the following extensions:
- `uuid-ossp` - UUID generation
- `pgcrypto` - Cryptographic functions
- `pg_trgm` - Full-text search
- `unaccent` - Accent-insensitive search

See `docker/postgres/init.sql` for initialization script.

## Security Features

- JWT authentication with refresh tokens
- Bcrypt password hashing (12 rounds)
- AES-256-GCM encryption for PII data
- Rate limiting (100 req/15min per IP)
- Helmet security headers
- CORS protection
- SQL injection prevention (parameterized queries)
- XSS protection
- CSRF protection

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test -- --coverage
```

### Linting

```bash
# Check for linting errors
npm run lint

# Fix linting errors automatically
npm run lint:fix
```

### Database Migrations

```bash
# Create new migration
npx sequelize-cli migration:generate --name migration-name

# Run migrations
npm run db:migrate

# Rollback migration
npm run db:migrate:undo
```

### Database Seeders

```bash
# Create new seeder
npx sequelize-cli seed:generate --name seeder-name

# Run seeders
npm run db:seed

# Undo seeders
npm run db:seed:undo
```

## Docker Deployment

### Development

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### Production

```bash
# Build production image
docker build -t qcollector-backend:latest --target production .

# Run with docker-compose
docker-compose --profile prod up -d
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>
```

### Database Connection Failed
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection
psql postgresql://qcollector:password@localhost:5432/qcollector_db
```

### Redis Connection Failed
```bash
# Check Redis is running
docker-compose ps redis

# Test connection
redis-cli -h localhost -p 6379 -a your_redis_password ping
```

### MinIO Connection Failed
```bash
# Check MinIO is running
docker-compose ps minio

# Access MinIO console
open http://localhost:9001
```

## Performance Optimization

- Database connection pooling (2-10 connections)
- Redis caching for frequently accessed data
- Response compression with gzip
- Rate limiting to prevent abuse
- Nginx reverse proxy for static files
- CDN integration for file uploads (MinIO)

## Monitoring & Logging

- Winston logging to files and console
- Request/response logging with Morgan
- Error tracking with stack traces
- Audit logging for sensitive operations
- Performance monitoring (slow queries)

## Contributing

1. Create feature branch
2. Write tests
3. Run linting and tests
4. Submit pull request

## License

UNLICENSED - Internal use only

## Support

For issues and questions, contact the Q-Collector development team.

---

**Version**: 0.4.0
**Last Updated**: 2025-09-30
**Status**: Phase 1 Complete (Infrastructure Setup)