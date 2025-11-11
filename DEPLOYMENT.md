# Deployment Guide - Docker

Panduan deployment aplikasi KRL API menggunakan Docker.

## Prerequisites

- Docker installed
- PostgreSQL database (eksternal atau container terpisah)
- API token dari Indonesian Commuterline API

## Build Docker Image

```bash
docker build -t krl-api:latest .
```

## Run Container

### Basic Run

```bash
docker run -d \
  --name krl-api \
  -p 8917:8917 \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://user:password@host:5432/krl_api" \
  -e UPSTREAM_API_URL="https://api-partner.krl.co.id" \
  -e OFFICIAL_API_TOKEN="your_token_here" \
  -e SYNC_CRON_EXPRESSION="59 16 * * *" \
  krl-api:latest
```

API akan tersedia di `http://localhost:8917`

**Note**: Port 8917 sudah di-set di Dockerfile. Jika ingin override, tambahkan `-e PORT=3000` dan sesuaikan port mapping.

### Run dengan Environment File

```bash
docker run -d \
  --name krl-api \
  -p 8917:8917 \
  --env-file .env \
  krl-api:latest
```

## Container Management

### Stop Container
```bash
docker stop krl-api
```

### Start Container
```bash
docker start krl-api
```

### Restart Container
```bash
docker restart krl-api
```

### Remove Container
```bash
docker rm -f krl-api
```

### View Logs
```bash
docker logs krl-api

# Follow logs
docker logs -f krl-api

# Last 100 lines
docker logs --tail 100 krl-api
```

## Health Check

Container memiliki health check otomatis yang memeriksa endpoint `/health` setiap 30 detik.

Check status:
```bash
docker inspect --format='{{.State.Health.Status}}' krl-api
```

## Database Migration

Sebelum menjalankan container, pastikan database sudah di-setup:

```bash
# Generate migration
bun run db:generate

# Push to database
bun run db:push
```

Atau jalankan migration di dalam container:
```bash
docker exec krl-api bun run db:push
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 8917 | HTTP server port |
| `NODE_ENV` | No | development | Environment mode |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `UPSTREAM_API_URL` | Yes | - | Indonesian Commuterline API URL |
| `OFFICIAL_API_TOKEN` | Yes | - | Bearer token untuk API |
| `SYNC_CRON_EXPRESSION` | No | 59 16 * * * | Cron schedule untuk sync job |

## Production Deployment

### 1. Build Production Image
```bash
docker build -t krl-api:v1.0.0 .
```

### 2. Tag untuk Registry (opsional)
```bash
docker tag krl-api:v1.0.0 your-registry/krl-api:v1.0.0
docker push your-registry/krl-api:v1.0.0
```

### 3. Run dengan Restart Policy
```bash
docker run -d \
  --name krl-api \
  --restart unless-stopped \
  -p 8917:8917 \
  --env-file .env \
  --health-cmd="curl -f http://localhost:8917/health || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  --health-start-period=40s \
  krl-api:latest
```

## Troubleshooting

### Container tidak start
```bash
# Check logs
docker logs krl-api

# Check container status
docker ps -a | grep krl-api
```

### Database connection error
- Pastikan DATABASE_URL benar
- Pastikan database accessible dari container
- Jika database di localhost, gunakan `host.docker.internal` (Mac/Windows) atau IP host

### Port sudah digunakan
```bash
# Check port usage
lsof -i :8917

# Gunakan port lain (override PORT di container)
docker run -p 9000:9000 -e PORT=9000 ...
```

## Network Configuration

Jika database juga di Docker:

```bash
# Create network
docker network create krl-network

# Run database
docker run -d \
  --name postgres \
  --network krl-network \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=krl_api \
  postgres:16

# Run API
docker run -d \
  --name krl-api \
  --network krl-network \
  -p 8917:8917 \
  -e DATABASE_URL="postgresql://postgres:password@postgres:5432/krl_api" \
  -e UPSTREAM_API_URL="https://api-partner.krl.co.id" \
  -e OFFICIAL_API_TOKEN="your_token_here" \
  krl-api:latest
```
