import { db } from '../db'
import { stations, routeMaps, syncMetadata } from '../db/schema'
import { createUpstreamApiClient, UpstreamApiError } from './upstream-api'
import { createScheduleSyncService } from './schedule-sync'
import { eq, desc } from 'drizzle-orm'

export interface SyncStatus {
  timestamp: string
  status: 'success' | 'failed' | 'in_progress'
  errorMessage?: string
}

export interface SyncJob {
  runSync(): Promise<void>
  runScheduleSync(): Promise<void>
  getSyncStatus(): Promise<SyncStatus | null>
}

function formatToWIB(date: Date): string {
  const wibOffset = 7 * 60
  const utcTime = date.getTime()
  const wibTime = new Date(utcTime + wibOffset * 60 * 1000)
  
  const isoString = wibTime.toISOString().replace('Z', '+07:00')
  return isoString
}

function logWithTimestamp(message: string, error?: unknown): void {
  const timestamp = new Date().toISOString()
  if (error) {
    console.error(`[${timestamp}] ${message}`, error)
  } else {
    console.log(`[${timestamp}] ${message}`)
  }
}

export function createSyncJob(
  upstreamApiUrl: string,
  bearerToken: string
): SyncJob {
  const apiClient = createUpstreamApiClient(upstreamApiUrl, bearerToken)
  const scheduleSyncService = createScheduleSyncService(upstreamApiUrl, bearerToken)

  return {
    async runScheduleSync(): Promise<void> {
      const syncStartTime = new Date()
      logWithTimestamp('Starting schedule synchronization job')

      try {
        await db.insert(syncMetadata).values({
          timestamp: syncStartTime,
          status: 'in_progress',
          errorMessage: 'Schedule sync in progress',
        })
        logWithTimestamp('Schedule sync status updated to "in_progress"')

        await scheduleSyncService.syncSchedules()

        const syncEndTime = new Date()
        await db.insert(syncMetadata).values({
          timestamp: syncEndTime,
          status: 'success',
          errorMessage: 'Schedule sync completed successfully',
        })

        logWithTimestamp(
          `Schedule synchronization completed successfully at ${formatToWIB(syncEndTime)}`
        )
      } catch (error) {
        const syncEndTime = new Date()
        let errorMessage = 'Unknown error occurred during schedule sync'

        if (error instanceof UpstreamApiError) {
          errorMessage = `Upstream API error: ${error.message}`
          if (error.statusCode) {
            errorMessage += ` (Status: ${error.statusCode})`
          }
          if (error.responseBody) {
            errorMessage += ` - Response: ${JSON.stringify(error.responseBody)}`
          }
        } else if (error instanceof Error) {
          errorMessage = error.message
        }

        logWithTimestamp('Schedule synchronization failed', error)
        logWithTimestamp(`Error details: ${errorMessage}`)

        await db.insert(syncMetadata).values({
          timestamp: syncEndTime,
          status: 'failed',
          errorMessage,
        })

        logWithTimestamp(
          `Schedule sync status updated to "failed" at ${formatToWIB(syncEndTime)}`
        )

        throw error
      }
    },

    async runSync(): Promise<void> {
      const syncStartTime = new Date()
      logWithTimestamp('Starting synchronization job')

      try {
        await db.insert(syncMetadata).values({
          timestamp: syncStartTime,
          status: 'in_progress',
        })
        logWithTimestamp('Sync status updated to "in_progress"')

        logWithTimestamp('Fetching stations from upstream API')
        const stationsResponse = await apiClient.getStations()
        
        if (stationsResponse.status !== 200) {
          throw new Error(
            `Upstream API returned non-200 status for stations: ${stationsResponse.status}`
          )
        }

        logWithTimestamp(
          `Fetched ${stationsResponse.data.length} stations from upstream API`
        )

        logWithTimestamp('Fetching route maps from upstream API')
        const routeMapsResponse = await apiClient.getRouteMaps()
        
        if (routeMapsResponse.status !== 200) {
          throw new Error(
            `Upstream API returned non-200 status for route maps: ${routeMapsResponse.status}`
          )
        }

        logWithTimestamp(
          `Fetched ${routeMapsResponse.data.length} route maps from upstream API`
        )

        logWithTimestamp('Deleting existing station records')
        await db.delete(stations)
        
        logWithTimestamp('Inserting new station records')
        const now = new Date()
        await db.insert(stations).values(
          stationsResponse.data.map((station) => ({
            staId: station.sta_id,
            staName: station.sta_name,
            groupWil: station.group_wil,
            fgEnable: station.fg_enable,
            createdAt: now,
            updatedAt: now,
          }))
        )
        logWithTimestamp(
          `Inserted ${stationsResponse.data.length} station records`
        )

        logWithTimestamp('Deleting existing route map records')
        await db.delete(routeMaps)
        
        logWithTimestamp('Inserting new route map records')
        await db.insert(routeMaps).values(
          routeMapsResponse.data.map((routeMap) => ({
            area: routeMap.area,
            permalink: routeMap.permalink,
            createdAt: now,
            updatedAt: now,
          }))
        )
        logWithTimestamp(
          `Inserted ${routeMapsResponse.data.length} route map records`
        )

        const enableScheduleSync = process.env.ENABLE_SCHEDULE_SYNC !== 'false'
        
        if (enableScheduleSync) {
          logWithTimestamp('Starting schedule synchronization')
          
          try {
            await scheduleSyncService.syncSchedules()
            logWithTimestamp('Schedule synchronization completed')
          } catch (scheduleError) {
            logWithTimestamp('Schedule synchronization failed, but continuing with main sync', scheduleError)
          }
        } else {
          logWithTimestamp('Schedule synchronization skipped (ENABLE_SCHEDULE_SYNC=false)')
        }

        const syncEndTime = new Date()
        await db.insert(syncMetadata).values({
          timestamp: syncEndTime,
          status: 'success',
        })

        logWithTimestamp(
          `Synchronization completed successfully at ${formatToWIB(syncEndTime)}`
        )
      } catch (error) {
        const syncEndTime = new Date()
        let errorMessage = 'Unknown error occurred'

        if (error instanceof UpstreamApiError) {
          errorMessage = `Upstream API error: ${error.message}`
          if (error.statusCode) {
            errorMessage += ` (Status: ${error.statusCode})`
          }
          if (error.responseBody) {
            errorMessage += ` - Response: ${JSON.stringify(error.responseBody)}`
          }
        } else if (error instanceof Error) {
          errorMessage = error.message
        }

        logWithTimestamp('Synchronization failed', error)
        logWithTimestamp(`Error details: ${errorMessage}`)

        await db.insert(syncMetadata).values({
          timestamp: syncEndTime,
          status: 'failed',
          errorMessage,
        })

        logWithTimestamp(
          `Sync status updated to "failed" at ${formatToWIB(syncEndTime)}`
        )

        throw error
      }
    },

    async getSyncStatus(): Promise<SyncStatus | null> {
      try {
        const result = await db
          .select()
          .from(syncMetadata)
          .orderBy(desc(syncMetadata.id))
          .limit(1)

        if (result.length === 0) {
          return null
        }

        const latestSync = result[0]

        return {
          timestamp: formatToWIB(latestSync.timestamp),
          status: latestSync.status as 'success' | 'failed' | 'in_progress',
          errorMessage: latestSync.errorMessage || undefined,
        }
      } catch (error) {
        logWithTimestamp('Error retrieving sync status', error)
        throw error
      }
    },
  }
}
