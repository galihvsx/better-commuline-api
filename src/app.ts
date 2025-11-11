/**
 * Application Configuration
 * Sets up Hono app with middleware, routes, and OpenAPI documentation
 */

import { OpenAPIHono } from '@hono/zod-openapi'
import { apiReference } from '@scalar/hono-api-reference'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'
import { databaseMiddleware } from './middleware/database'
import { errorHandler } from './middleware/error-handler'
import { createRateLimiter } from './middleware/rate-limiter'
import { stations } from './db/schema'
import { routeMaps } from './db/schema'
import { createSyncJob } from './services/sync'
import {
  getStationsRoute,
  getSchedulesRoute,
  getFaresRoute,
  getRouteMapsRoute,
  getSyncStatusRoute,
  postSyncRoute,
} from './openapi/routes'

// Define environment type
type Env = {
  Variables: {
    db: any
  }
}

// Create OpenAPIHono app with proper typing
const app = new OpenAPIHono<Env>()

/**
 * Apply middleware in correct order:
 * 1. Logger - Request logging
 * 2. Database - Attach database instance to context
 * 3. Rate Limiter - Protect against abuse
 * 4. Error Handler - Global error handling
 * Requirement: 6.1
 */
app.use('*', logger())
app.use('*', databaseMiddleware())
app.use('*', createRateLimiter())

// Apply global error handler
app.onError(errorHandler)

/**
 * GET /stations - Retrieve all stations
 */
app.openapi(getStationsRoute, async (c) => {
  try {
    const db = c.get('db')
    const allStations = await db.select().from(stations)

    return c.json({ data: allStations }, 200)
  } catch (error) {
    console.error('Database error while fetching stations:', error)
    throw new HTTPException(500, {
      message: 'Failed to fetch stations from database',
    })
  }
})

/**
 * GET /schedules - Proxy real-time schedule data
 */
app.openapi(getSchedulesRoute, async (c) => {
  try {
    const { stationid, timefrom, timeto } = c.req.valid('query')

    const upstreamApiUrl = process.env.UPSTREAM_API_URL!
    const bearerToken = process.env.OFFICIAL_API_TOKEN || ''

    const upstreamUrl = new URL('/krl-webs/v1/schedules', upstreamApiUrl)
    upstreamUrl.searchParams.append('stationid', stationid)
    upstreamUrl.searchParams.append('timefrom', timefrom)
    upstreamUrl.searchParams.append('timeto', timeto)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      const response = await fetch(upstreamUrl.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const responseBody = await response.json()

      return c.json(responseBody, response.status as any)
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        console.error(
          `[${new Date().toISOString()}] Upstream API timeout for schedules:`,
          { stationid, timefrom, timeto }
        )
        throw new HTTPException(503, {
          message: 'Upstream API is currently unavailable',
        })
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error(
          `[${new Date().toISOString()}] Network error connecting to upstream API:`,
          error.message
        )
        throw new HTTPException(503, {
          message: 'Upstream API is currently unavailable',
        })
      }

      throw error
    }
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }

    console.error(
      `[${new Date().toISOString()}] Unexpected error in schedules endpoint:`,
      error
    )

    throw new HTTPException(500, {
      message: 'Internal Server Error',
    })
  }
})

/**
 * GET /fares - Proxy real-time fare data
 */
app.openapi(getFaresRoute, async (c) => {
  try {
    const { stationfrom, stationto } = c.req.valid('query')

    const upstreamApiUrl = process.env.UPSTREAM_API_URL!
    const bearerToken = process.env.OFFICIAL_API_TOKEN || ''

    const upstreamUrl = new URL('/krl-webs/v1/fare', upstreamApiUrl)
    upstreamUrl.searchParams.append('stationfrom', stationfrom)
    upstreamUrl.searchParams.append('stationto', stationto)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      const response = await fetch(upstreamUrl.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const responseBody = await response.json()

      return c.json(responseBody, response.status as any)
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        console.error(
          `[${new Date().toISOString()}] Upstream API timeout for fares:`,
          { stationfrom, stationto }
        )
        throw new HTTPException(503, {
          message: 'Upstream API is currently unavailable',
        })
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error(
          `[${new Date().toISOString()}] Network error connecting to upstream API:`,
          error.message
        )
        throw new HTTPException(503, {
          message: 'Upstream API is currently unavailable',
        })
      }

      throw error
    }
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }

    console.error(
      `[${new Date().toISOString()}] Unexpected error in fares endpoint:`,
      error
    )

    throw new HTTPException(500, {
      message: 'Internal Server Error',
    })
  }
})

/**
 * GET /routemaps - Retrieve all route maps
 */
app.openapi(getRouteMapsRoute, async (c) => {
  try {
    const db = c.get('db')
    const allRouteMaps = await db.select().from(routeMaps)

    return c.json({ data: allRouteMaps }, 200)
  } catch (error) {
    console.error('Database error while fetching route maps:', error)
    throw new HTTPException(500, {
      message: 'Failed to fetch route maps from database',
    })
  }
})

/**
 * GET /sync-status - Retrieve sync status
 */
app.openapi(getSyncStatusRoute, async (c) => {
  try {
    const upstreamApiUrl = process.env.UPSTREAM_API_URL
    const bearerToken = process.env.OFFICIAL_API_TOKEN

    if (!upstreamApiUrl || !bearerToken) {
      throw new HTTPException(500, {
        message:
          'Server configuration error: missing required environment variables',
      })
    }

    const syncJob = createSyncJob(upstreamApiUrl, bearerToken)
    const status = await syncJob.getSyncStatus()

    if (!status) {
      return c.json(
        {
          timestamp: null,
          status: 'never_synced',
          message: 'No synchronization has been performed yet',
        },
        200
      )
    }

    const response: {
      timestamp: string
      status: string
      error?: string
    } = {
      timestamp: status.timestamp,
      status: status.status,
    }

    if (status.status === 'failed' && status.errorMessage) {
      response.error = status.errorMessage
    }

    return c.json(response, 200)
  } catch (error) {
    console.error('Error retrieving sync status:', error)

    if (error instanceof HTTPException) {
      throw error
    }

    throw new HTTPException(500, {
      message: 'Failed to retrieve sync status',
    })
  }
})

/**
 * GET /sync - Info endpoint for sync functionality
 * Returns information about how to trigger sync
 */
app.get('/sync', (c) => {
  return c.json({
    message: 'Use POST method to trigger synchronization',
    method: 'POST',
    endpoint: '/sync',
    description: 'Triggers manual data synchronization from upstream API',
    status_endpoint: '/sync-status',
    example: 'curl -X POST http://localhost:8917/sync',
  })
})

/**
 * POST /sync - Manual sync trigger endpoint
 * Triggers async synchronization job
 */
app.post('/sync', async (c) => {
  try {
    const upstreamApiUrl = process.env.UPSTREAM_API_URL
    const bearerToken = process.env.OFFICIAL_API_TOKEN

    if (!upstreamApiUrl || !bearerToken) {
      throw new HTTPException(500, {
        message:
          'Server configuration error: missing required environment variables',
      })
    }

    const syncJob = createSyncJob(upstreamApiUrl, bearerToken)
    const currentStatus = await syncJob.getSyncStatus()

    if (currentStatus && currentStatus.status === 'in_progress') {
      throw new HTTPException(409, {
        message: 'Sync is already in progress',
      })
    }

    syncJob.runSync().catch((error) => {
      console.error('Background sync failed:', error)
    })

    return c.json(
      {
        message: 'Sync has started',
      },
      202
    )
  } catch (error) {
    console.error('Error triggering sync:', error)

    if (error instanceof HTTPException) {
      throw error
    }

    throw new HTTPException(500, {
      message: 'Failed to trigger sync',
    })
  }
})

// Build server URLs dynamically based on environment
function getServerUrls() {
  const servers = []

  // Production URL
  if (process.env.API_BASE_URL) {
    servers.push({
      url: process.env.API_BASE_URL,
      description: 'Production server',
    })
  }

  // Development server (always add as fallback)
  const port = process.env.PORT || '8917'
  servers.push({
    url: `http://localhost:${port}`,
    description: 'Development server',
  })

  return servers
}

// OpenAPI documentation endpoint
app.doc('/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'Commuter Line API',
    version: '1.0.0',
    description:
      'API for Indonesian Commuterline train schedules, stations, fares, and route maps. This API synchronizes static reference data (stations and route maps) daily at 23:59 WIB and provides real-time proxy endpoints for dynamic data (schedules and fares).',
  },
  servers: getServerUrls(),
  tags: [
    {
      name: 'Stations',
      description: 'Station data endpoints',
    },
    {
      name: 'Schedules',
      description: 'Real-time schedule data endpoints',
    },
    {
      name: 'Fares',
      description: 'Real-time fare data endpoints',
    },
    {
      name: 'Route Maps',
      description: 'Route map data endpoints',
    },
    {
      name: 'Synchronization',
      description: 'Data synchronization endpoints',
    },
  ],
})

// Scalar API documentation endpoint
app.get(
  '/reference',
  apiReference({
    theme: 'purple',
    spec: {
      url: '/openapi.json',
    },
  })
)

/**
 * GET /health - Health check endpoint
 * Returns status, timestamp, and uptime
 * Requirement: 6.1
 */
app.get('/health', (c) => {
  const uptimeSeconds = process.uptime()
  const timestamp = new Date().toISOString()

  return c.json({
    status: 'healthy',
    timestamp,
    uptime: uptimeSeconds,
  })
})

/**
 * GET / - Root endpoint
 * Provides basic API information and documentation link
 */
app.get('/', (c) => {
  return c.json({
    status: 'healthy',
    message: 'Commuter Line API is running',
    documentation: '/reference',
    health: '/health',
  })
})

export default app
