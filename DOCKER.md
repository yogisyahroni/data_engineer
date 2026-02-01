# InsightEngine AI - Docker Deployment Guide

## 🚀 Quick Start

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

### 1. Environment Setup

Copy the environment template:

```bash
cp .env.example .env
```

**IMPORTANT**: Update the following values in `.env`:

```bash
ENCRYPTION_KEY=<generate-with-openssl-rand-base64-32>
JWT_SECRET=<your-secure-random-string>
```

Generate secure keys:

```bash
# Generate ENCRYPTION_KEY (32 bytes)
openssl rand -base64 32

# Generate JWT_SECRET
openssl rand -base64 64
```

### 2. Build and Run

Start all services:

```bash
docker-compose up -d
```

This will start:

- **PostgreSQL** on port 5432
- **Go Backend** on port 8080
- **Next.js Frontend** on port 3000

### 3. Verify Deployment

Check service health:

```bash
# Backend health
curl http://localhost:8080/api/health

# Backend readiness (includes DB check)
curl http://localhost:8080/api/health/ready

# Frontend
curl http://localhost:3000
```

View logs:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### 4. Access the Application

- **Frontend**: <http://localhost:3000>
- **Backend API**: <http://localhost:8080/api>
- **Health Check**: <http://localhost:8080/api/health>

## 🛠️ Development Commands

### Build Services

```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build backend
docker-compose build frontend
```

### Start/Stop Services

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes (⚠️ deletes database data)
docker-compose down -v
```

### Database Management

#### Run Migrations

```bash
# Access backend container
docker-compose exec backend sh

# Run migrations manually (if needed)
psql $DATABASE_URL -f migrations/20260202_add_performance_indexes.sql
```

#### Access PostgreSQL

```bash
# Using docker-compose
docker-compose exec postgres psql -U postgres -d insight_engine

# Using psql from host (if installed)
psql postgresql://postgres:postgres@localhost:5432/insight_engine
```

### View Service Status

```bash
# Check running containers
docker-compose ps

# Check resource usage
docker stats
```

## 📊 Health Checks

The application includes comprehensive health checks:

### Backend Health Endpoints

1. **Basic Health Check**

   ```bash
   curl http://localhost:8080/api/health
   ```

   Response:

   ```json
   {
     "status": "ok",
     "service": "InsightEngine Backend",
     "version": "1.0.0"
   }
   ```

2. **Readiness Check** (includes database connectivity)

   ```bash
   curl http://localhost:8080/api/health/ready
   ```

   Response:

   ```json
   {
     "status": "ready",
     "database": "connected",
     "service": "InsightEngine Backend"
   }
   ```

3. **Liveness Check**

   ```bash
   curl http://localhost:8080/api/health/live
   ```

   Response:

   ```json
   {
     "status": "alive"
   }
   ```

## 🔧 Troubleshooting

### Backend won't start

```bash
# Check logs
docker-compose logs backend

# Common issues:
# 1. Database not ready - wait for postgres health check
# 2. Missing ENCRYPTION_KEY - check .env file
# 3. Port 8080 already in use - stop conflicting service
```

### Frontend build fails

```bash
# Check logs
docker-compose logs frontend

# Rebuild with no cache
docker-compose build --no-cache frontend
```

### Database connection errors

```bash
# Check postgres is running
docker-compose ps postgres

# Check postgres logs
docker-compose logs postgres

# Verify DATABASE_URL in .env
```

### Reset Everything

```bash
# Stop all services and remove volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up -d
```

## 🚀 Production Deployment

### Environment Variables

For production, ensure you set:

```bash
# Strong encryption key (32 bytes)
ENCRYPTION_KEY=<secure-random-32-bytes>

# Strong JWT secret
JWT_SECRET=<secure-random-string>

# Production database URL
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require

# Production frontend URL
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

### Security Checklist

- [ ] Change default PostgreSQL password
- [ ] Generate strong ENCRYPTION_KEY (32 bytes)
- [ ] Generate strong JWT_SECRET
- [ ] Enable SSL for database connection
- [ ] Use HTTPS for frontend
- [ ] Configure CORS for production domain
- [ ] Set up firewall rules
- [ ] Enable database backups

### Performance Optimization

The application includes:

- ✅ 35+ database indexes for fast queries
- ✅ Connection pool tuning (MaxOpen=50, MaxIdle=25)
- ✅ Multi-stage Docker builds for minimal image size
- ✅ Health checks for orchestration
- ✅ Graceful shutdown for zero-downtime deploys

### Monitoring

Health check endpoints can be used with:

- **Docker**: Built-in health checks
- **Kubernetes**: Liveness and readiness probes
- **Load Balancers**: Health check configuration
- **Monitoring Tools**: Prometheus, Datadog, etc.

## 📝 Architecture

```
┌─────────────────┐
│   Frontend      │
│   (Next.js)     │
│   Port: 3000    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Backend       │
│   (Go/Fiber)    │
│   Port: 8080    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │
│   Port: 5432    │
└─────────────────┘
```

## 🎯 Next Steps

1. **Run migrations**: Database indexes are in `backend/migrations/`
2. **Create admin user**: Use backend API to create first user
3. **Configure AI providers**: Add API keys for OpenAI, Anthropic, etc.
4. **Set up monitoring**: Add Prometheus metrics (optional)
5. **Configure backups**: Set up automated database backups

## 📚 Additional Resources

- **Backend API Docs**: <http://localhost:8080/api/health>
- **Frontend**: <http://localhost:3000>
- **Database Schema**: See `backend/migrations/`

## 🆘 Support

For issues or questions:

1. Check logs: `docker-compose logs -f`
2. Verify health checks: `curl http://localhost:8080/api/health/ready`
3. Review environment variables in `.env`
