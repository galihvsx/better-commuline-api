import { db } from '../db'
import { schedules, stations } from '../db/schema'
import { eq, and, gte, lte } from 'drizzle-orm'
import { parseTimeToTimestamp } from '../utils/time-parsing'
import { HTTPException } from 'hono/http-exception'

export interface ScheduleQueryResult {
  train_id: string
  ka_name: string
  route_name: string
  dest: string
  time_est: string
  dest_time: string
  color: string | null
}

export interface ScheduleResponse {
  status: number
  data: ScheduleQueryResult[]
}

export interface ScheduleQueryService {
  querySchedules(
    stationId: string,
    timeFrom: string,
    timeTo: string
  ): Promise<ScheduleResponse>
}

export class DatabaseConnectionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DatabaseConnectionError'
  }
}

export class DatabaseQueryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DatabaseQueryError'
  }
}

function formatTimeFromTimestamp(timestamp: Date): string {
  const hours = timestamp.getHours().toString().padStart(2, '0')
  const minutes = timestamp.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

function extractColorFromMetadata(metadataJson: string | null): string | null {
  if (!metadataJson) {
    return null
  }
  
  try {
    const metadata = JSON.parse(metadataJson)
    return metadata?.origin?.color || null
  } catch {
    return null
  }
}

function parseTimeToLocalTimestamp(timeStr: string): Date {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/
  const match = timeStr.match(timeRegex)
  
  if (!match) {
    throw new Error(`Invalid time format: ${timeStr}. Expected HH:mm format.`)
  }
  
  const hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setHours(hours, minutes, 0, 0)
  
  return date
}

export function createScheduleQueryService(): ScheduleQueryService {
  return {
    async querySchedules(
      stationId: string,
      timeFrom: string,
      timeTo: string
    ): Promise<ScheduleResponse> {
      try {
        const timeFromTimestamp = parseTimeToLocalTimestamp(timeFrom)
        const timeToTimestamp = parseTimeToLocalTimestamp(timeTo)

        let stationExists: { staId: string }[] = []
        
        try {
          stationExists = await db
            .select({ staId: stations.staId })
            .from(stations)
            .where(eq(stations.staId, stationId))
            .limit(1)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(
            `[${new Date().toISOString()}] Database connection error while checking station existence:`,
            {
              stationId,
              error: errorMessage,
              stack: error instanceof Error ? error.stack : undefined,
            }
          )
          throw new HTTPException(503, {
            message: 'Database service unavailable',
          })
        }

        if (stationExists.length === 0) {
          console.error(
            `[${new Date().toISOString()}] Invalid station ID requested:`,
            {
              stationId,
              timeFrom,
              timeTo,
            }
          )
          throw new HTTPException(404, {
            message: `Station with ID '${stationId}' not found`,
          })
        }

        const destinationStation = {
          staId: stations.staId,
          staName: stations.staName,
        }

        let results
        
        try {
          results = await db
            .select({
              train_id: schedules.trainId,
              ka_name: schedules.lineName,
              route_name: schedules.routeName,
              dest: stations.staName,
              departs_at: schedules.departsAt,
              arrives_at: schedules.arrivesAt,
              metadata: schedules.metadata,
            })
            .from(schedules)
            .innerJoin(
              stations,
              eq(schedules.destinationStationId, stations.staId)
            )
            .where(
              and(
                eq(schedules.stationId, stationId),
                gte(schedules.departsAt, timeFromTimestamp),
                lte(schedules.departsAt, timeToTimestamp)
              )
            )
            .orderBy(schedules.departsAt)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(
            `[${new Date().toISOString()}] Database query error while fetching schedules:`,
            {
              stationId,
              timeFrom,
              timeTo,
              error: errorMessage,
              stack: error instanceof Error ? error.stack : undefined,
            }
          )
          throw new HTTPException(500, {
            message: 'Failed to query schedules',
          })
        }

        const data = results.map(row => ({
          train_id: row.train_id,
          ka_name: row.ka_name,
          route_name: row.route_name,
          dest: row.dest,
          time_est: formatTimeFromTimestamp(row.departs_at),
          dest_time: formatTimeFromTimestamp(row.arrives_at),
          color: extractColorFromMetadata(row.metadata),
        }))

        return {
          status: 200,
          data,
        }
      } catch (error) {
        if (error instanceof HTTPException) {
          throw error
        }
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(
          `[${new Date().toISOString()}] Unexpected error in querySchedules:`,
          {
            stationId,
            timeFrom,
            timeTo,
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
          }
        )
        
        throw new HTTPException(500, {
          message: 'Internal server error',
        })
      }
    },
  }
}
