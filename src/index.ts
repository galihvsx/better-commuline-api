import * as cron from 'node-cron'
import { createSyncJob } from './services/sync'
import app from './app'

function validateEnvironmentVariables(): void {
  const requiredEnvVars = [
    'DATABASE_URL',
    'UPSTREAM_API_URL',
    'OFFICIAL_API_TOKEN',
  ] as const

  const missingVars: string[] = []

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingVars.push(envVar)
    }
  }

  if (missingVars.length > 0) {
    console.error(
      `[${new Date().toISOString()}] CRITICAL ERROR: Missing required environment variables:`
    )
    missingVars.forEach((varName) => {
      console.error(`  - ${varName}`)
    })
    console.error('\nApplication cannot start without these variables.')
    process.exit(1)
  }

  if (!process.env.ENABLE_SCHEDULE_SYNC) {
    process.env.ENABLE_SCHEDULE_SYNC = 'true'
  }

  if (!process.env.SCHEDULE_SYNC_BATCH_SIZE) {
    process.env.SCHEDULE_SYNC_BATCH_SIZE = '5'
  } else {
    const batchSize = parseInt(process.env.SCHEDULE_SYNC_BATCH_SIZE, 10)
    if (isNaN(batchSize) || batchSize < 1) {
      console.warn(
        `[${new Date().toISOString()}] WARNING: Invalid SCHEDULE_SYNC_BATCH_SIZE value. Using default: 5`
      )
      process.env.SCHEDULE_SYNC_BATCH_SIZE = '5'
    }
  }

  if (!process.env.SCHEDULE_SYNC_DELAY_MS) {
    process.env.SCHEDULE_SYNC_DELAY_MS = '5000'
  } else {
    const delayMs = parseInt(process.env.SCHEDULE_SYNC_DELAY_MS, 10)
    if (isNaN(delayMs) || delayMs < 0) {
      console.warn(
        `[${new Date().toISOString()}] WARNING: Invalid SCHEDULE_SYNC_DELAY_MS value. Using default: 5000`
      )
      process.env.SCHEDULE_SYNC_DELAY_MS = '5000'
    }
  }

  console.log(
    `[${new Date().toISOString()}] Environment variables validated successfully`
  )
  console.log(
    `[${new Date().toISOString()}] Schedule sync configuration: ENABLE=${process.env.ENABLE_SCHEDULE_SYNC}, BATCH_SIZE=${process.env.SCHEDULE_SYNC_BATCH_SIZE}, DELAY_MS=${process.env.SCHEDULE_SYNC_DELAY_MS}`
  )
}

function startCronScheduler(): void {
  const upstreamApiUrl = process.env.UPSTREAM_API_URL!
  const bearerToken = process.env.OFFICIAL_API_TOKEN!

  const syncJob = createSyncJob(upstreamApiUrl, bearerToken)

  const cronExpression = process.env.SYNC_CRON_SCHEDULE || '59 16 * * *'

  cron.schedule(
    cronExpression,
    async () => {
      console.log(
        `[${new Date().toISOString()}] Starting scheduled sync at 23:59 WIB`
      )
      try {
        await syncJob.runSync()
        console.log(
          `[${new Date().toISOString()}] Scheduled sync completed successfully`
        )
      } catch (error) {
        console.error(
          `[${new Date().toISOString()}] Scheduled sync failed:`,
          error
        )
      }
    },
    {
      timezone: 'Asia/Jakarta',
    }
  )

  console.log(
    `[${new Date().toISOString()}] Cron scheduler started: ${cronExpression} (Asia/Jakarta timezone)`
  )
}

function initializeApplication(): void {
  console.log(
    `[${new Date().toISOString()}] Initializing Commuter Line API...`
  )

  validateEnvironmentVariables()

  const isVercel = process.env.VERCEL === '1'
  if (!isVercel) {
    startCronScheduler()
  } else {
    console.log(
      `[${new Date().toISOString()}] Running in Vercel environment - cron job managed by Vercel Cron`
    )
  }

  console.log(
    `[${new Date().toISOString()}] Application initialized successfully`
  )
  console.log(
    `[${new Date().toISOString()}] Server is ready to accept requests`
  )
}

const isVercelBuild = process.env.VERCEL === '1'
if (!isVercelBuild) {
  initializeApplication()
}

export default app
