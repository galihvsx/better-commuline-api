import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import { scheduleQuerySchema } from '../schemas/validation'
import type { ScheduleQuery } from '../schemas/validation'

const app = new Hono()

/**
 * GET /schedules - Proxy endpoint for real-time schedule data
 * Requirements: 2.2, 2.5, 2.6, 2.7, 3.3, 3.4, 7.6, 7.7
 * 
 * Validates query parameters and forwards request to upstream API
 * Query parameters:
 * - stationid: Station ID (required)
 * - timefrom: Start time in HH:mm format (required)
 * - timeto: End time in HH:mm format (required)
 */
app.get('/', zValidator('query', scheduleQuerySchema), async (c) => {
  try {
    // Get validated query parameters
    const { stationid, timefrom, timeto } = c.req.valid('query') as ScheduleQuery

    // Get environment variables
    const upstreamApiUrl = process.env.UPSTREAM_API_URL!
    const bearerToken = process.env.OFFICIAL_API_TOKEN || ''

    // Build upstream URL with query parameters
    const upstreamUrl = new URL('/krl-webs/v1/schedules', upstreamApiUrl)
    upstreamUrl.searchParams.append('stationid', stationid)
    upstreamUrl.searchParams.append('timefrom', timefrom)
    upstreamUrl.searchParams.append('timeto', timeto)

    // Create AbortController for 10-second timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      // Forward request to upstream API with Bearer token
      const response = await fetch(upstreamUrl.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
        signal: controller.signal,
      })

      // Clear timeout
      clearTimeout(timeoutId)

      // Get response body
      const responseBody = await response.json()

      // Return upstream response with same status code
      // Cast status to any to handle non-200 status codes from upstream
      return c.json(responseBody, response.status as any)
    } catch (error) {
      // Clear timeout in case of error
      clearTimeout(timeoutId)

      // Handle abort/timeout errors
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(
          `[${new Date().toISOString()}] Upstream API timeout for schedules:`,
          { stationid, timefrom, timeto }
        )
        throw new HTTPException(503, {
          message: 'Upstream API is currently unavailable',
        })
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error(
          `[${new Date().toISOString()}] Network error connecting to upstream API:`,
          error.message
        )
        throw new HTTPException(503, {
          message: 'Upstream API is currently unavailable',
        })
      }

      // Re-throw other errors
      throw error
    }
  } catch (error) {
    // If it's already an HTTPException, re-throw it
    if (error instanceof HTTPException) {
      throw error
    }

    // Log unexpected errors
    console.error(
      `[${new Date().toISOString()}] Unexpected error in schedules endpoint:`,
      error
    )

    // Return generic error
    throw new HTTPException(500, {
      message: 'Internal Server Error',
    })
  }
})

export default app
