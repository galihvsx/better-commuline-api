<div align="center">
  <img src="./assets/cover.png" alt="Better Commuline Cover" width="300"/>
  
  # Better Commuline API
  
  **A modern, high-performance API wrapper for Indonesia's KRL Commuterline service**
  
  [![Built with Bun](https://img.shields.io/badge/Built%20with-Bun-black?logo=bun)](https://bun.sh)
  [![Powered by Hono](https://img.shields.io/badge/Powered%20by-Hono-orange)](https://hono.dev)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
</div>

---

## 🚆 Overview

Better Commuline API is a robust, production-ready API that provides cached access to Indonesia's KRL Commuterline data. Built with modern technologies like Bun, Hono, and Drizzle ORM, it offers blazing-fast performance with intelligent caching and automatic synchronization.

### ✨ Key Features

- **⚡ Lightning Fast**: Built on Bun runtime for exceptional performance
- **🔄 Auto-Sync**: Scheduled daily synchronization at 23:59 WIB
- **💾 Smart Caching**: PostgreSQL-backed caching reduces upstream API load
- **🛡️ Rate Limited**: Built-in rate limiting (100 req/min per IP)
- **📝 Type Safe**: Full TypeScript support with Zod validation
- **🔍 Well Documented**: OpenAPI 3.1 specification with Scalar UI
- **🐳 Docker Ready**: Production-ready containerization

---

## 📋 Table of Contents

- [Getting Started](#-getting-started)
- [API Endpoints](#-api-endpoints)
- [Environment Variables](#-environment-variables)
- [Development](#-development)
- [Database](#-database)
- [Deployment](#-deployment)
- [Architecture](#-architecture)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- PostgreSQL >= 14
- Access to KRL Commuterline Official API

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/galihvsx/better-commuline-api.git
   cd better-commuline-api
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   bun run db:generate
   bun run db:push
   ```

5. **Start the development server**
   ```bash
   bun run dev
   ```

The API will be available at `http://localhost:8917`

---

## 📡 API Endpoints

### Station Data

#### `GET /stations`
Retrieve all KRL stations (cached from daily sync)

**Response:**
```json
{
  "data": [
    {
      "sta_id": "BTA",
      "sta_name": "BATUCEPER",
      "group_wil": 1,
      "fg_enable": 1
    }
  ]
}
```

---

### Schedule Information

#### `GET /schedules`
Get train schedules for a specific station (served from database cache)

**Query Parameters:**
- `stationid` (required): Station ID (e.g., "BTA")
- `timefrom` (required): Start time in HH:mm format (e.g., "06:00")
- `timeto` (required): End time in HH:mm format (e.g., "08:00")

**Cache Information:**
- Schedule data is cached in the database and refreshed daily at 23:59 WIB (16:59 UTC)
- Full-day schedules (00:00-23:59) are stored for all active stations
- Time range filtering is performed on cached data for fast response times
- Maintains backward compatibility with previous API structure

**Example:**
```bash
curl "http://localhost:8917/schedules?stationid=BTA&timefrom=06:00&timeto=08:00"
```

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "train_id": "1234",
      "ka_name": "COMMUTER LINE",
      "route_name": "BOGOR-JAKARTA KOTA",
      "dest": "JAKARTA KOTA",
      "time_est": "06:15:00",
      "color": "#FF0000",
      "dest_time": "07:45:00"
    }
  ]
}
```

---

### Fare Calculation

#### `GET /fares`
Calculate fare between two stations (proxied to upstream API)

**Query Parameters:**
- `stationfrom` (required): Origin station ID
- `stationto` (required): Destination station ID

**Example:**
```bash
curl "http://localhost:8917/fares?stationfrom=BTA&stationto=THB"
```

---

### Route Maps

#### `GET /routemaps`
Retrieve KRL route map data (cached from daily sync)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "area": 1,
      "permalink": "https://example.com/map.png"
    }
  ]
}
```

---

### Synchronization

#### `GET /sync-status`
Check the status of the last synchronization

**Response:**
```json
{
  "timestamp": "2024-01-15T23:59:00+07:00",
  "status": "success",
  "error": null
}
```

#### `POST /sync`
Manually trigger a synchronization job (stations, route maps, and schedules)

**Response:**
```json
{
  "message": "Sync started"
}
```

**Status Codes:**
- `202`: Sync started successfully
- `409`: Sync already in progress

**Note:** The sync job includes:
- Station data synchronization
- Route map synchronization
- Schedule data synchronization (full-day schedules for all active stations)

#### `POST /sync/schedules`
Manually trigger schedule synchronization only

**Response:**
```json
{
  "message": "Schedule sync started"
}
```

**Status Codes:**
- `202`: Schedule sync started successfully
- `409`: Sync already in progress

---

### Health Check

#### `GET /health`
Check API health status

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600
}
```

---

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=8917
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/krl_api

# Upstream API
UPSTREAM_API_URL=https://api-partner.krl.co.id
OFFICIAL_API_TOKEN=your_bearer_token_here

# Sync Configuration (optional)
SYNC_CRON_EXPRESSION=59 16 * * *  # 23:59 WIB (16:59 UTC)
```

---

## 💻 Development

### Available Scripts

```bash
# Development with hot reload
bun run dev

# Database operations
bun run db:generate    # Generate migration files
bun run db:push        # Apply migrations
bun run db:studio      # Open Drizzle Studio
```

### Project Structure

```
krl-api/
├── src/
│   ├── db/
│   │   ├── index.ts          # Database connection
│   │   └── schema.ts         # Drizzle schema definitions
│   ├── middleware/
│   │   ├── database.ts       # Database context middleware
│   │   ├── error-handler.ts  # Global error handler
│   │   └── rate-limiter.ts   # Rate limiting middleware
│   ├── routes/
│   │   ├── stations.ts       # Station endpoints
│   │   ├── schedules.ts      # Schedule endpoints
│   │   ├── fares.ts          # Fare endpoints
│   │   └── sync.ts           # Sync endpoints
│   ├── schemas/
│   │   └── validation.ts     # Zod validation schemas
│   ├── services/
│   │   ├── sync.ts           # Sync job service
│   │   └── upstream-api.ts   # Upstream API client
│   ├── utils/
│   │   └── station-normalization.ts  # Station name normalization
│   └── index.ts              # Application entry point
├── drizzle/                  # Database migrations
├── docs/                     # Documentation files
└── assets/                   # Static assets
```

---

## 🗄️ Database

This project uses PostgreSQL with Drizzle ORM for type-safe database operations.

### Schema

**stations**: Cached station data
- `sta_id` (PK): Station identifier
- `sta_name`: Station name
- `group_wil`: Regional group
- `fg_enable`: Enable flag
- `metadata`: JSON field for additional data (e.g., active status)
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

**schedules**: Cached schedule data for all stations
- `id` (PK): Unique schedule identifier (format: `sc_krl_{station_id}_{train_id}`)
- `station_id` (FK): Reference to stations table
- `origin_station_id` (FK): Origin station reference
- `destination_station_id` (FK): Destination station reference
- `train_id`: Train identifier
- `line_name`: Line name (e.g., "Commuter Line")
- `route_name`: Route description (e.g., "BOGOR-JAKARTA KOTA")
- `departs_at`: Departure timestamp with timezone
- `arrives_at`: Arrival timestamp with timezone
- `metadata`: JSON field for additional data (e.g., line color)
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp
- **Indexes**: `station_id`, `train_id`, `departs_at` for query performance

**route_maps**: Cached route map data
- `id` (PK): Auto-increment ID
- `area`: Area identifier
- `permalink`: Map image URL
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

**sync_metadata**: Synchronization history
- `id` (PK): Auto-increment ID
- `timestamp`: Sync execution time
- `status`: Sync status (success/failed/in_progress)
- `error_message`: Error details if failed
- `created_at`: Record creation timestamp

---

## 🐳 Deployment

### Docker

Build and run with Docker:

```bash
# Build image
docker build -t krl-api:latest .

# Run container
docker run -d \
  --name krl-api \
  -p 8917:8917 \
  --env-file .env \
  --restart unless-stopped \
  krl-api:latest
```

API akan tersedia di `http://localhost:8917`

For complete deployment guide including production setup, health checks, and troubleshooting, see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## 🏗️ Architecture

### Technology Stack

- **Runtime**: [Bun](https://bun.sh) - Fast JavaScript runtime
- **Framework**: [Hono](https://hono.dev) - Ultrafast web framework
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team)
- **Validation**: [Zod](https://zod.dev) - TypeScript-first schema validation
- **Scheduling**: [node-cron](https://github.com/node-cron/node-cron) - Task scheduler
- **Rate Limiting**: [hono-rate-limiter](https://github.com/rhinobase/hono-rate-limiter)
- **HTTP Client**: Native Fetch API with CORS preflight support

### Design Patterns

- **Proxy Pattern**: Schedules and fares endpoints proxy to upstream API
- **Cache-Aside**: Stations and route maps cached in PostgreSQL
- **Middleware Chain**: Logging → Database → Rate Limiting → Error Handling
- **Service Layer**: Separation of business logic from route handlers

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- KRL Commuterline for providing the official API
- The Bun and Hono communities for excellent tooling
- All contributors who help improve this project

---

<div align="center">
  <p>Made with ❤️ for Indonesian commuters</p>
  <p>
    <a href="https://github.com/galihvsx/better-commuline-api/issues">Report Bug</a>
    ·
    <a href="https://github.com/galihvsx/better-commuline-api/issues">Request Feature</a>
  </p>
</div>
