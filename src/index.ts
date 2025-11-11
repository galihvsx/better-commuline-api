import { Hono } from 'hono'
import { logger } from 'hono/logger'
import cron from 'node-cron'
import { createSyncJob } from './services/sync'
import { databaseMiddleware } from './middleware/database'
import { errorHandler } from './middleware/error-handler'
import { createRateLimiter } from './middleware/rate-limiter'
import stationsRoute from './routes/stations'
import schedulesRoute from './routes/schedules'
import faresRoute from './routes/fares'
import syncRoute from './routes/sync'

const app = new Hono()

// Apply middleware in correct order
app.use('*', logger())
app.use('*', databaseMiddleware())
app.use('*', createRateLimiter())

// Apply global error handler
app.onError(errorHandler)

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'COMMUTERLINE_API_BASE_URL',
] as const

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`)
    process.exit(1)
  }
}

// Get environment variables
const upstreamApiUrl = process.env.COMMUTERLINE_API_BASE_URL!
const bearerToken = process.env.OFFICIAL_API_TOKEN || ''

// Create sync job instance
const syncJob = createSyncJob(upstreamApiUrl, bearerToken)

// Configure scheduled sync job
// Cron expression "59 16 * * *" runs at 16:59 UTC, which is 23:59 WIB (UTC+7)
const cronExpression = '59 16 * * *'

cron.schedule(
  cronExpression,
  async () => {
    console.log('Starting scheduled sync at 23:59 WIB')
    try {
      await syncJob.runSync()
    } catch (error) {
      console.error('Scheduled sync failed:', error)
    }
  },
  {
    timezone: 'Asia/Jakarta',
  }
)

console.log(
  `Scheduled sync job configured: ${cronExpression} (Asia/Jakarta timezone)`
)

// Mount routes
app.route('/stations', stationsRoute)
app.route('/schedules', schedulesRoute)
app.route('/fares', faresRoute)
app.route('/', syncRoute)

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
