import { db } from '../db'
import { stations, schedules } from '../db/schema'
import { createUpstreamApiClient, UpstreamApiClient, UpstreamApiError } from './upstream-api'
import { parseRouteName } from '../utils/station-normalization'
import { eq } from 'drizzle-orm'

export interface ScheduleSyncService {
  syncSchedules(): Promise<void>
  syncScheduleForStation(stationId: string): Promise<number>
}

function generateScheduleId(stationId: string, trainId: string): string {
  return `sc_krl_${stationId}_${trainId}`.toLowerCase()
}

export function createScheduleSyncService(
  upstreamApiUrl: string,
  bearerToken: string
): ScheduleSyncService {
  const apiClient: UpstreamApiClient = createUpstreamApiClient(upstreamApiUrl, bearerToken)

  return {
    async syncSchedules(): Promise<void> {
      const timestamp = new Date().toISOString()
      console.log(`[${timestamp}] Starting schedule sync for all active stations`)

      const activeStations = await db
        .select()
        .from(stations)
        .where(eq(stations.fgEnable, 1))

      console.log(`[${new Date().toISOString()}] Found ${activeStations.length} active stations to sync`)

      const BATCH_SIZE = parseInt(process.env.SCHEDULE_SYNC_BATCH_SIZE || '5', 10)
      const DELAY_MS = parseInt(process.env.SCHEDULE_SYNC_DELAY_MS || '5000', 10)

      const batches: typeof activeStations[] = []
      for (let i = 0; i < activeStations.length; i += BATCH_SIZE) {
        batches.push(activeStations.slice(i, i + BATCH_SIZE))
      }

      console.log(`[${new Date().toISOString()}] Processing ${batches.length} batches of ${BATCH_SIZE} stations each`)

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex]
        const batchTimestamp = new Date().toISOString()
        
        console.log(`[${batchTimestamp}] Starting batch ${batchIndex + 1}/${batches.length} with ${batch.length} stations`)

        const batchPromises = batch.map(async (station, stationIndex) => {
          if (stationIndex > 0) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS))
          }

          try {
            const count = await this.syncScheduleForStation(station.staId)
            return { stationId: station.staId, success: true, count }
          } catch (error) {
            return { 
              stationId: station.staId, 
              success: false, 
              error: error instanceof Error ? error.message : String(error) 
            }
          }
        })

        const results = await Promise.allSettled(batchPromises)

        const successCount = results.filter(
          r => r.status === 'fulfilled' && r.value.success
        ).length
        const failureCount = results.filter(
          r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
        ).length

        console.log(
          `[${new Date().toISOString()}] Completed batch ${batchIndex + 1}/${batches.length}: ` +
          `${successCount} succeeded, ${failureCount} failed`
        )
      }

      console.log(`[${new Date().toISOString()}] Schedule sync completed for all stations`)
    },

    async syncScheduleForStation(stationId: string): Promise<number> {
      const timestamp = new Date().toISOString()
      
      try {
        const scheduleUrl = new URL('/krl-webs/v1/schedules', upstreamApiUrl)
        scheduleUrl.searchParams.append('stationid', stationId)
        scheduleUrl.searchParams.append('timefrom', '00:00')
        scheduleUrl.searchParams.append('timeto', '23:59')

        await apiClient.sendPreflightRequest(scheduleUrl.toString())

        const response = await apiClient.getSchedules(stationId, '00:00', '23:59')

        if (!response.data || response.data.length === 0) {
          console.log(`[${timestamp}] Station ${stationId}: No schedule data returned`)
          return 0
        }

        const allStations = await db.select().from(stations)
        const stationMap = new Map(
          allStations.map(s => [s.staName.toUpperCase(), s.staId])
        )

        const scheduleRecords = []
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        for (const schedule of response.data) {
          try {
            const { origin, destination } = parseRouteName(schedule.route_name)

            const originStationId = stationMap.get(origin.toUpperCase())
            const destinationStationId = stationMap.get(destination.toUpperCase())

            if (!originStationId || !destinationStationId) {
              continue
            }

            const scheduleId = generateScheduleId(stationId, schedule.train_id)

            const [departHours, departMinutes] = schedule.time_est.split(':').map(Number)
            const departsAt = new Date(today)
            departsAt.setHours(departHours, departMinutes, 0, 0)

            const [arriveHours, arriveMinutes] = schedule.dest_time.split(':').map(Number)
            const arrivesAt = new Date(today)
            arrivesAt.setHours(arriveHours, arriveMinutes, 0, 0)

            const metadata = JSON.stringify({
              origin: {
                color: schedule.color || null
              }
            })

            scheduleRecords.push({
              id: scheduleId,
              stationId,
              originStationId,
              destinationStationId,
              trainId: schedule.train_id,
              lineName: schedule.ka_name,
              routeName: schedule.route_name,
              departsAt,
              arrivesAt,
              metadata,
              updatedAt: new Date(),
            })
          } catch (parseError) {
            console.error(
              `[${new Date().toISOString()}] Station ${stationId}: Parse error for schedule`,
              {
                error: parseError instanceof Error ? parseError.message : String(parseError),
                schedule: schedule,
              }
            )
            continue
          }
        }

        if (scheduleRecords.length === 0) {
          console.log(`[${new Date().toISOString()}] Station ${stationId}: No valid schedule records after parsing`)
          return 0
        }

        let insertedCount = 0
        for (const record of scheduleRecords) {
          await db
            .insert(schedules)
            .values(record)
            .onConflictDoUpdate({
              target: schedules.id,
              set: {
                departsAt: record.departsAt,
                arrivesAt: record.arrivesAt,
                metadata: record.metadata,
                updatedAt: record.updatedAt,
              },
            })
          insertedCount++
        }

        console.log(`[${new Date().toISOString()}] Station ${stationId}: Successfully inserted/updated ${insertedCount} schedule records`)
        
        return insertedCount
      } catch (error) {
        if (error instanceof UpstreamApiError && error.statusCode === 404) {
          const stationMetadata = JSON.stringify({ active: false })
          
          await db
            .update(stations)
            .set({
              metadata: stationMetadata,
              updatedAt: new Date(),
            })
            .where(eq(stations.staId, stationId))

          console.log(`[${new Date().toISOString()}] Station ${stationId}: Marked as inactive due to 404 response`)
          
          return 0
        }
        
        if (error instanceof UpstreamApiError) {
          console.error(
            `[${new Date().toISOString()}] Station ${stationId}: Upstream API error`,
            {
              statusCode: error.statusCode,
              message: error.message,
              responseBody: error.responseBody,
            }
          )
          throw error
        }
        
        console.error(
          `[${new Date().toISOString()}] Station ${stationId}: Sync failed`,
          {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          }
        )
        throw error
      }
    },
  }
}
