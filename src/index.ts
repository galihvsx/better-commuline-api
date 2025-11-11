/**
 * Main Application Entry Point
 * Initializes the Hono application with middleware, routes, and scheduled jobs
 */

import * as cron from 'node-cron'
import { createSyncJob } from './services/sync'
import app from './app'

/**
 * Validate required environment variables on startup
 * Requirements: 6.1, 6.5
 */
function validateEnvironmentVariables(): void {
  const requiredEnvVars = [
    'DATABASE_URL',
    'COMMUTERLINE_API_BASE_URL',
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

  console.log(
    `[${new Date().toISOString()}] Environment variables validated successfully`
  )
}

/**
 * Initialize and start the cron scheduler for sync job
 * Requirement: 6.5
 */
function startCronScheduler(): void {
  const upstreamApiUrl = process.env.COMMUTERLINE_API_BASE_URL!
  const bearerToken = process.env.OFFICIAL_API_TOKEN!

  // Create sync job instance
  const syncJob = createSyncJob(upstreamApiUrl, bearerToken)

  // Configure scheduled sync job
  // Cron expression "59 16 * * *" runs at 16:59 UTC, which is 23:59 WIB (UTC+7)
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

/**
 * Application initialization
 */
function initializeApplication(): void {
  console.log(
    `[${new Date().toISOString()}] Initializing Commuter Line API...`
  )

  // Step 1: Validate environment variables
  validateEnvironmentVariables()

  // Step 2: Start cron scheduler for sync job
  startCronScheduler()

  console.log(
    `[${new Date().toISOString()}] Application initialized successfully`
  )
  console.log(
    `[${new Date().toISOString()}] Server is ready to accept requests`
  )
}

// Initialize the application
initializeApplication()

// Export app for Bun runtime
export default app
