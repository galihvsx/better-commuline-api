import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import { scheduleQuerySchema } from '../schemas/validation'
import type { ScheduleQuery } from '../schemas/validation'
import { createScheduleQueryService } from '../services/schedule-query'

const app = new Hono()

app.get('/', zValidator('query', scheduleQuerySchema), async (c) => {
  try {
    const { stationid, timefrom, timeto } = c.req.valid('query') as ScheduleQuery

    const scheduleQueryService = createScheduleQueryService()
    const result = await scheduleQueryService.querySchedules(
      stationid,
      timefrom,
      timeto
    )

    return c.json(result, result.status as any)
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
