import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { createSyncJob } from '../services/sync'

const app = new Hono()

app.get('/sync-status', async (c) => {
  try {
    const upstreamApiUrl = process.env.UPSTREAM_API_URL
    const bearerToken = process.env.OFFICIAL_API_TOKEN

    if (!upstreamApiUrl || !bearerToken) {
      throw new HTTPException(500, {
        message: 'Server configuration error: missing required environment variables',
      })
    }

    const syncJob = createSyncJob(upstreamApiUrl, bearerToken)

    const status = await syncJob.getSyncStatus()

    if (!status) {
      return c.json({
        timestamp: null,
        status: 'never_synced',
        message: 'No synchronization has been performed yet',
      })
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

app.post('/sync', async (c) => {
  try {
    const upstreamApiUrl = process.env.UPSTREAM_API_URL
    const bearerToken = process.env.OFFICIAL_API_TOKEN

    if (!upstreamApiUrl || !bearerToken) {
      throw new HTTPException(500, {
        message: 'Server configuration error: missing required environment variables',
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

export default app
