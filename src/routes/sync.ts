import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { createSyncJob } from '../services/sync'

const app = new Hono()

/**
 * GET /sync-status
 * Retrieves the latest sync metadata from database
 * Returns timestamp (ISO 8601 with WIB timezone), status, and error (if failed)
 */
app.get('/sync-status', async (c) => {
  try {
    // Get environment variables
    const upstreamApiUrl = process.env.UPSTREAM_API_URL
    const bearerToken = process.env.OFFICIAL_API_TOKEN

    if (!upstreamApiUrl || !bearerToken) {
      throw new HTTPException(500, {
        message: 'Server configuration error: missing required environment variables',
      })
    }

    // Create sync job instance
    const syncJob = createSyncJob(upstreamApiUrl, bearerToken)

    // Get sync status
    const status = await syncJob.getSyncStatus()

    // Handle case when no sync has occurred yet
    if (!status) {
      return c.json({
        timestamp: null,
        status: 'never_synced',
        message: 'No synchronization has been performed yet',
      })
    }

    // Return sync status with timestamp, status, and error (if failed)
    const response: {
      timestamp: string
      status: string
      error?: string
    } = {
      timestamp: status.timestamp,
      status: status.status,
    }

    // Include error message if status is failed
    if (status.status === 'failed' && status.errorMessage) {
      response.error = status.errorMessage
    }

    return c.json(response)
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
 * POST /sync
 * Manually triggers a data synchronization
 * Returns 409 if sync is already in progress
 * Returns 202 if sync has started successfully
 */
app.post('/sync', async (c) => {
  try {
    // Get environment variables
    const upstreamApiUrl = process.env.UPSTREAM_API_URL
    const bearerToken = process.env.OFFICIAL_API_TOKEN

    if (!upstreamApiUrl || !bearerToken) {
      throw new HTTPException(500, {
        message: 'Server configuration error: missing required environment variables',
      })
    }

    // Create sync job instance
    const syncJob = createSyncJob(upstreamApiUrl, bearerToken)

    // Check current sync status from database
    const currentStatus = await syncJob.getSyncStatus()

    // Return 409 if sync is already "in_progress"
    if (currentStatus && currentStatus.status === 'in_progress') {
      throw new HTTPException(409, {
        message: 'Sync is already in progress',
      })
    }

    // Invoke runSync() asynchronously if not in progress
    // Don't await - let it run in the background
    syncJob.runSync().catch((error) => {
      console.error('Background sync failed:', error)
    })

    // Return 202 status with message indicating sync has started
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

export default app
