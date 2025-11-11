import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import { scheduleQuerySchema } from '../schemas/validation'
import type { ScheduleQuery } from '../schemas/validation'

const app = new Hono()

app.get('/', zValidator('query', scheduleQuerySchema), async (c) => {
  try {
    const { stationid, timefrom, timeto } = c.req.valid('query') as ScheduleQuery

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

export default app
