import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import { fareQuerySchema } from '../schemas/validation'
import type { FareQuery } from '../schemas/validation'

const app = new Hono()

/**
 * GET /fares - Proxy endpoint for real-time fare data
 * Requirements: 2.3, 2.5, 2.6, 2.7, 3.3, 3.4, 8.4, 8.5
 * 
 * Validates query parameters and forwards request to upstream API
 * Query parameters:
 * - stationfrom: Origin station ID (required)
 * - stationto: Destination station ID (required)
 */
app.get('/', zValidator('query', fareQuerySchema), async (c) => {
  try {
    // Get validated query parameters
    const { stationfrom, stationto } = c.req.valid('query') as FareQuery

    // Get environment variables
    const upstreamApiUrl = process.env.UPSTREAM_API_URL!
    const bearerToken = process.env.OFFICIAL_API_TOKEN || ''

    // Build upstream URL with query parameters
    const upstreamUrl = new URL('/krl-webs/v1/fare', upstreamApiUrl)
    upstreamUrl.searchParams.append('stationfrom', stationfrom)
    upstreamUrl.searchParams.append('stationto', stationto)

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
          `[${new Date().toISOString()}] Upstream API timeout for fares:`,
          { stationfrom, stationto }
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
      `[${new Date().toISOString()}] Unexpected error in fares endpoint:`,
      error
    )

    // Return generic error
    throw new HTTPException(500, {
      message: 'Internal Server Error',
    })
  }
})

export default app
