/**
 * Synchronization Job Service
 * Handles daily sync of stations and route maps from upstream API
 */

import { db } from '../db'
import { stations, routeMaps, syncMetadata } from '../db/schema'
import { createUpstreamApiClient, UpstreamApiError } from './upstream-api'
import { eq, desc } from 'drizzle-orm'

export interface SyncStatus {
  timestamp: string // ISO 8601 format with WIB timezone
  status: 'success' | 'failed' | 'in_progress'
  errorMessage?: string
}

export interface SyncJob {
  runSync(): Promise<void>
  getSyncStatus(): Promise<SyncStatus | null>
}

/**
 * Formats a date to ISO 8601 with WIB timezone (UTC+7)
 */
function formatToWIB(date: Date): string {
  // WIB is UTC+7
  const wibOffset = 7 * 60 // 7 hours in minutes
  const utcTime = date.getTime()
  const wibTime = new Date(utcTime + wibOffset * 60 * 1000)
  
  // Format as ISO 8601 with +07:00 timezone
  const isoString = wibTime.toISOString().replace('Z', '+07:00')
  return isoString
}

/**
 * Logs a message with timestamp
 */
function logWithTimestamp(message: string, error?: unknown): void {
  const timestamp = new Date().toISOString()
  if (error) {
    console.error(`[${timestamp}] ${message}`, error)
  } else {
    console.log(`[${timestamp}] ${message}`)
  }
}

/**
 * Creates a synchronization job instance
 */
export function createSyncJob(
  upstreamApiUrl: string,
  bearerToken: string
): SyncJob {
  const apiClient = createUpstreamApiClient(upstreamApiUrl, bearerToken)

  return {
    /**
     * Runs the synchronization process
     * Updates status to "in_progress", fetches data from upstream API,
     * replaces database records, and updates sync metadata
     */
    async runSync(): Promise<void> {
      const syncStartTime = new Date()
      logWithTimestamp('Starting synchronization job')

      try {
        // Step 1: Update sync status to "in_progress"
        await db.insert(syncMetadata).values({
          timestamp: syncStartTime,
          status: 'in_progress',
          errorMessage: null,
        })
        logWithTimestamp('Sync status updated to "in_progress"')

        // Step 2: Fetch stations from upstream API
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

        // Step 3: Fetch route maps from upstream API
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

        // Step 4: Replace all existing station records
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

        // Step 5: Replace all existing route map records
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

        // Step 6: Update sync metadata with success status
        const syncEndTime = new Date()
        await db.insert(syncMetadata).values({
          timestamp: syncEndTime,
          status: 'success',
          errorMessage: null,
        })

        logWithTimestamp(
          `Synchronization completed successfully at ${formatToWIB(syncEndTime)}`
        )
      } catch (error) {
        // Handle synchronization errors
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

        // Update sync metadata with failed status
        await db.insert(syncMetadata).values({
          timestamp: syncEndTime,
          status: 'failed',
          errorMessage,
        })

        logWithTimestamp(
          `Sync status updated to "failed" at ${formatToWIB(syncEndTime)}`
        )

        // Re-throw the error for caller to handle if needed
        throw error
      }
    },

    /**
     * Retrieves the latest sync metadata from database
     * Returns null if no sync has occurred yet
     */
    async getSyncStatus(): Promise<SyncStatus | null> {
      try {
        // Query the latest sync metadata record
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
