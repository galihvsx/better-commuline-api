import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { createSyncJob, type SyncStatus } from '../../src/services/sync'
import type { UpstreamApiClient } from '../../src/services/upstream-api'

const mockDb = {
  insert: mock(() => ({
    values: mock(() => Promise.resolve()),
  })),
  delete: mock(() => Promise.resolve()),
  select: mock(() => ({
    from: mock(() => ({
      orderBy: mock(() => ({
        limit: mock(() => Promise.resolve([])),
      })),
    })),
  })),
}

mock.module('../db', () => ({
  db: mockDb,
}))

describe('SyncJob', () => {
  const upstreamApiUrl = 'https://api-partner.krl.co.id'
  const bearerToken = 'test-token'

  beforeEach(() => {
    mock.restore()
  })

  describe('runSync', () => {
    test('should complete sync successfully', async () => {
      const mockApiClient: UpstreamApiClient = {
        getStations: mock(() =>
          Promise.resolve({
            status: 200,
            message: 'Success',
            data: [
              {
                sta_id: 'BKS',
                sta_name: 'BEKASI',
                group_wil: 0,
                fg_enable: 1,
              },
            ],
          })
        ),
        getRouteMaps: mock(() =>
          Promise.resolve({
            status: 200,
            data: [
              {
                area: 0,
                permalink: 'https://example.com/map.png',
              },
            ],
          })
        ),
        getSchedules: mock(() => Promise.resolve({ status: 200, data: [] })),
        getFare: mock(() => Promise.resolve({ status: 200, data: [] })),
      }

      mock.module('./upstream-api', () => ({
        createUpstreamApiClient: () => mockApiClient,
        UpstreamApiError: class UpstreamApiError extends Error {},
      }))

      const syncJob = createSyncJob(upstreamApiUrl, bearerToken)

      await expect(syncJob.runSync()).resolves.toBeUndefined()

      expect(mockApiClient.getStations).toHaveBeenCalled()
      expect(mockApiClient.getRouteMaps).toHaveBeenCalled()
    })

    test('should update status to in_progress at start', async () => {
      const insertMock = mock(() => ({
        values: mock(() => Promise.resolve()),
      }))

      const mockDb = {
        insert: insertMock,
        delete: mock(() => Promise.resolve()),
        select: mock(() => ({
          from: mock(() => ({
            orderBy: mock(() => ({
              limit: mock(() => Promise.resolve([])),
            })),
          })),
        })),
      }

      mock.module('../db', () => ({ db: mockDb }))

      const mockApiClient: UpstreamApiClient = {
        getStations: mock(() =>
          Promise.resolve({
            status: 200,
            message: 'Success',
            data: [],
          })
        ),
        getRouteMaps: mock(() =>
          Promise.resolve({
            status: 200,
            data: [],
          })
        ),
        getSchedules: mock(() => Promise.resolve({ status: 200, data: [] })),
        getFare: mock(() => Promise.resolve({ status: 200, data: [] })),
      }

      mock.module('./upstream-api', () => ({
        createUpstreamApiClient: () => mockApiClient,
        UpstreamApiError: class UpstreamApiError extends Error {},
      }))

      const syncJob = createSyncJob(upstreamApiUrl, bearerToken)
      await syncJob.runSync()

      expect(insertMock).toHaveBeenCalled()
    })

    test('should handle upstream API errors', async () => {
      class UpstreamApiError extends Error {
        constructor(
          message: string,
          public statusCode?: number,
          public responseBody?: unknown
        ) {
          super(message)
          this.name = 'UpstreamApiError'
        }
      }

      const mockApiClient: UpstreamApiClient = {
        getStations: mock(() => {
          throw new UpstreamApiError('API Error', 500, 'Server Error')
        }),
        getRouteMaps: mock(() => Promise.resolve({ status: 200, data: [] })),
        getSchedules: mock(() => Promise.resolve({ status: 200, data: [] })),
        getFare: mock(() => Promise.resolve({ status: 200, data: [] })),
      }

      mock.module('./upstream-api', () => ({
        createUpstreamApiClient: () => mockApiClient,
        UpstreamApiError,
      }))

      const syncJob = createSyncJob(upstreamApiUrl, bearerToken)

      await expect(syncJob.runSync()).rejects.toThrow()
    })

    test('should handle non-200 status from upstream API', async () => {
      const mockApiClient: UpstreamApiClient = {
        getStations: mock(() =>
          Promise.resolve({
            status: 500,
            message: 'Internal Server Error',
            data: [],
          })
        ),
        getRouteMaps: mock(() => Promise.resolve({ status: 200, data: [] })),
        getSchedules: mock(() => Promise.resolve({ status: 200, data: [] })),
        getFare: mock(() => Promise.resolve({ status: 200, data: [] })),
      }

      mock.module('./upstream-api', () => ({
        createUpstreamApiClient: () => mockApiClient,
        UpstreamApiError: class UpstreamApiError extends Error {},
      }))

      const syncJob = createSyncJob(upstreamApiUrl, bearerToken)

      await expect(syncJob.runSync()).rejects.toThrow(
        'Upstream API returned non-200 status for stations: 500'
      )
    })

    test('should delete existing records before inserting new ones', async () => {
      const deleteMock = mock(() => Promise.resolve())

      const mockDb = {
        insert: mock(() => ({
          values: mock(() => Promise.resolve()),
        })),
        delete: deleteMock,
        select: mock(() => ({
          from: mock(() => ({
            orderBy: mock(() => ({
              limit: mock(() => Promise.resolve([])),
            })),
          })),
        })),
      }

      mock.module('../db', () => ({ db: mockDb }))

      const mockApiClient: UpstreamApiClient = {
        getStations: mock(() =>
          Promise.resolve({
            status: 200,
            message: 'Success',
            data: [
              {
                sta_id: 'BKS',
                sta_name: 'BEKASI',
                group_wil: 0,
                fg_enable: 1,
              },
            ],
          })
        ),
        getRouteMaps: mock(() =>
          Promise.resolve({
            status: 200,
            data: [
              {
                area: 0,
                permalink: 'https://example.com/map.png',
              },
            ],
          })
        ),
        getSchedules: mock(() => Promise.resolve({ status: 200, data: [] })),
        getFare: mock(() => Promise.resolve({ status: 200, data: [] })),
      }

      mock.module('./upstream-api', () => ({
        createUpstreamApiClient: () => mockApiClient,
        UpstreamApiError: class UpstreamApiError extends Error {},
      }))

      const syncJob = createSyncJob(upstreamApiUrl, bearerToken)
      await syncJob.runSync()

      expect(deleteMock).toHaveBeenCalled()
    })
  })

  describe('getSyncStatus', () => {
    test('should return null when no sync has occurred', async () => {
      const mockDb = {
        insert: mock(() => ({
          values: mock(() => Promise.resolve()),
        })),
        delete: mock(() => Promise.resolve()),
        select: mock(() => ({
          from: mock(() => ({
            orderBy: mock(() => ({
              limit: mock(() => Promise.resolve([])),
            })),
          })),
        })),
      }

      mock.module('../db', () => ({ db: mockDb }))

      const syncJob = createSyncJob(upstreamApiUrl, bearerToken)
      const status = await syncJob.getSyncStatus()

      expect(status).toBeNull()
    })

    test('should return latest sync status', async () => {
      const mockSyncRecord = {
        id: 1,
        timestamp: new Date('2024-01-01T16:59:00Z'),
        status: 'success',
        errorMessage: null,
        createdAt: new Date(),
      }

      const mockDb = {
        insert: mock(() => ({
          values: mock(() => Promise.resolve()),
        })),
        delete: mock(() => Promise.resolve()),
        select: mock(() => ({
          from: mock(() => ({
            orderBy: mock(() => ({
              limit: mock(() => Promise.resolve([mockSyncRecord])),
            })),
          })),
        })),
      }

      mock.module('../db', () => ({ db: mockDb }))

      const syncJob = createSyncJob(upstreamApiUrl, bearerToken)
      const status = await syncJob.getSyncStatus()

      expect(status).not.toBeNull()
      expect(status?.status).toBe('success')
      expect(status?.timestamp).toContain('+07:00')
    })

    test('should include error message for failed sync', async () => {
      const mockSyncRecord = {
        id: 2,
        timestamp: new Date('2024-01-01T16:59:00Z'),
        status: 'failed',
        errorMessage: 'Network timeout',
        createdAt: new Date(),
      }

      const mockDb = {
        insert: mock(() => ({
          values: mock(() => Promise.resolve()),
        })),
        delete: mock(() => Promise.resolve()),
        select: mock(() => ({
          from: mock(() => ({
            orderBy: mock(() => ({
              limit: mock(() => Promise.resolve([mockSyncRecord])),
            })),
          })),
        })),
      }

      mock.module('../db', () => ({ db: mockDb }))

      const syncJob = createSyncJob(upstreamApiUrl, bearerToken)
      const status = await syncJob.getSyncStatus()

      expect(status).not.toBeNull()
      expect(status?.status).toBe('failed')
      expect(status?.errorMessage).toBe('Network timeout')
    })

    test('should format timestamp in WIB timezone', async () => {
      const mockSyncRecord = {
        id: 1,
        timestamp: new Date('2024-01-01T00:00:00Z'),
        status: 'success',
        errorMessage: null,
        createdAt: new Date(),
      }

      const mockDb = {
        insert: mock(() => ({
          values: mock(() => Promise.resolve()),
        })),
        delete: mock(() => Promise.resolve()),
        select: mock(() => ({
          from: mock(() => ({
            orderBy: mock(() => ({
              limit: mock(() => Promise.resolve([mockSyncRecord])),
            })),
          })),
        })),
      }

      mock.module('../db', () => ({ db: mockDb }))

      const syncJob = createSyncJob(upstreamApiUrl, bearerToken)
      const status = await syncJob.getSyncStatus()

      expect(status?.timestamp).toMatch(/\+07:00$/)
    })
  })

  describe('runScheduleSync', () => {
    test('should call schedule sync service', async () => {
      const mockScheduleSyncService = {
        syncSchedules: mock(() => Promise.resolve()),
        syncScheduleForStation: mock(() => Promise.resolve(0)),
      }

      mock.module('../../src/services/schedule-sync', () => ({
        createScheduleSyncService: () => mockScheduleSyncService,
      }))

      const mockApiClient: UpstreamApiClient = {
        getStations: mock(() => Promise.resolve({ status: 200, message: 'Success', data: [] })),
        getRouteMaps: mock(() => Promise.resolve({ status: 200, data: [] })),
        getSchedules: mock(() => Promise.resolve({ status: 200, data: [] })),
        getFare: mock(() => Promise.resolve({ status: 200, data: [] })),
      }

      mock.module('../../src/services/upstream-api', () => ({
        createUpstreamApiClient: () => mockApiClient,
        UpstreamApiError: class UpstreamApiError extends Error {},
      }))

      const syncJob = createSyncJob(upstreamApiUrl, bearerToken)
      await syncJob.runScheduleSync()

      expect(mockScheduleSyncService.syncSchedules).toHaveBeenCalled()
    })

    test('should update sync metadata with success status', async () => {
      const insertMock = mock(() => ({
        values: mock(() => Promise.resolve()),
      }))

      const mockDb = {
        insert: insertMock,
        delete: mock(() => Promise.resolve()),
        select: mock(() => ({
          from: mock(() => ({
            orderBy: mock(() => ({
              limit: mock(() => Promise.resolve([])),
            })),
          })),
        })),
      }

      mock.module('../../src/db', () => ({ db: mockDb }))

      const mockScheduleSyncService = {
        syncSchedules: mock(() => Promise.resolve()),
        syncScheduleForStation: mock(() => Promise.resolve(0)),
      }

      mock.module('../../src/services/schedule-sync', () => ({
        createScheduleSyncService: () => mockScheduleSyncService,
      }))

      const mockApiClient: UpstreamApiClient = {
        getStations: mock(() => Promise.resolve({ status: 200, message: 'Success', data: [] })),
        getRouteMaps: mock(() => Promise.resolve({ status: 200, data: [] })),
        getSchedules: mock(() => Promise.resolve({ status: 200, data: [] })),
        getFare: mock(() => Promise.resolve({ status: 200, data: [] })),
      }

      mock.module('../../src/services/upstream-api', () => ({
        createUpstreamApiClient: () => mockApiClient,
        UpstreamApiError: class UpstreamApiError extends Error {},
      }))

      const syncJob = createSyncJob(upstreamApiUrl, bearerToken)
      await syncJob.runScheduleSync()

      expect(insertMock).toHaveBeenCalled()
    })

    test('should handle schedule sync errors and update metadata', async () => {
      const insertMock = mock(() => ({
        values: mock(() => Promise.resolve()),
      }))

      const mockDb = {
        insert: insertMock,
        delete: mock(() => Promise.resolve()),
        select: mock(() => ({
          from: mock(() => ({
            orderBy: mock(() => ({
              limit: mock(() => Promise.resolve([])),
            })),
          })),
        })),
      }

      mock.module('../../src/db', () => ({ db: mockDb }))

      const mockScheduleSyncService = {
        syncSchedules: mock(() => Promise.reject(new Error('Schedule sync failed'))),
        syncScheduleForStation: mock(() => Promise.resolve(0)),
      }

      mock.module('../../src/services/schedule-sync', () => ({
        createScheduleSyncService: () => mockScheduleSyncService,
      }))

      const mockApiClient: UpstreamApiClient = {
        getStations: mock(() => Promise.resolve({ status: 200, message: 'Success', data: [] })),
        getRouteMaps: mock(() => Promise.resolve({ status: 200, data: [] })),
        getSchedules: mock(() => Promise.resolve({ status: 200, data: [] })),
        getFare: mock(() => Promise.resolve({ status: 200, data: [] })),
      }

      mock.module('../../src/services/upstream-api', () => ({
        createUpstreamApiClient: () => mockApiClient,
        UpstreamApiError: class UpstreamApiError extends Error {},
      }))

      const syncJob = createSyncJob(upstreamApiUrl, bearerToken)

      await expect(syncJob.runScheduleSync()).rejects.toThrow('Schedule sync failed')
      expect(insertMock).toHaveBeenCalled()
    })
  })

  describe('runSync with schedule sync', () => {
    test('should call schedule sync when ENABLE_SCHEDULE_SYNC is true', async () => {
      process.env.ENABLE_SCHEDULE_SYNC = 'true'

      const mockScheduleSyncService = {
        syncSchedules: mock(() => Promise.resolve()),
        syncScheduleForStation: mock(() => Promise.resolve(0)),
      }

      mock.module('../../src/services/schedule-sync', () => ({
        createScheduleSyncService: () => mockScheduleSyncService,
      }))

      const mockApiClient: UpstreamApiClient = {
        getStations: mock(() =>
          Promise.resolve({
            status: 200,
            message: 'Success',
            data: [],
          })
        ),
        getRouteMaps: mock(() =>
          Promise.resolve({
            status: 200,
            data: [],
          })
        ),
        getSchedules: mock(() => Promise.resolve({ status: 200, data: [] })),
        getFare: mock(() => Promise.resolve({ status: 200, data: [] })),
      }

      mock.module('../../src/services/upstream-api', () => ({
        createUpstreamApiClient: () => mockApiClient,
        UpstreamApiError: class UpstreamApiError extends Error {},
      }))

      const syncJob = createSyncJob(upstreamApiUrl, bearerToken)
      await syncJob.runSync()

      expect(mockScheduleSyncService.syncSchedules).toHaveBeenCalled()

      delete process.env.ENABLE_SCHEDULE_SYNC
    })

    test('should skip schedule sync when ENABLE_SCHEDULE_SYNC is false', async () => {
      process.env.ENABLE_SCHEDULE_SYNC = 'false'

      const mockScheduleSyncService = {
        syncSchedules: mock(() => Promise.resolve()),
        syncScheduleForStation: mock(() => Promise.resolve(0)),
      }

      mock.module('../../src/services/schedule-sync', () => ({
        createScheduleSyncService: () => mockScheduleSyncService,
      }))

      const mockApiClient: UpstreamApiClient = {
        getStations: mock(() =>
          Promise.resolve({
            status: 200,
            message: 'Success',
            data: [],
          })
        ),
        getRouteMaps: mock(() =>
          Promise.resolve({
            status: 200,
            data: [],
          })
        ),
        getSchedules: mock(() => Promise.resolve({ status: 200, data: [] })),
        getFare: mock(() => Promise.resolve({ status: 200, data: [] })),
      }

      mock.module('../../src/services/upstream-api', () => ({
        createUpstreamApiClient: () => mockApiClient,
        UpstreamApiError: class UpstreamApiError extends Error {},
      }))

      const syncJob = createSyncJob(upstreamApiUrl, bearerToken)
      await syncJob.runSync()

      expect(mockScheduleSyncService.syncSchedules).not.toHaveBeenCalled()

      delete process.env.ENABLE_SCHEDULE_SYNC
    })

    test('should continue main sync even if schedule sync fails', async () => {
      process.env.ENABLE_SCHEDULE_SYNC = 'true'

      const mockScheduleSyncService = {
        syncSchedules: mock(() => Promise.reject(new Error('Schedule sync error'))),
        syncScheduleForStation: mock(() => Promise.resolve(0)),
      }

      mock.module('../../src/services/schedule-sync', () => ({
        createScheduleSyncService: () => mockScheduleSyncService,
      }))

      const mockApiClient: UpstreamApiClient = {
        getStations: mock(() =>
          Promise.resolve({
            status: 200,
            message: 'Success',
            data: [],
          })
        ),
        getRouteMaps: mock(() =>
          Promise.resolve({
            status: 200,
            data: [],
          })
        ),
        getSchedules: mock(() => Promise.resolve({ status: 200, data: [] })),
        getFare: mock(() => Promise.resolve({ status: 200, data: [] })),
      }

      mock.module('../../src/services/upstream-api', () => ({
        createUpstreamApiClient: () => mockApiClient,
        UpstreamApiError: class UpstreamApiError extends Error {},
      }))

      const syncJob = createSyncJob(upstreamApiUrl, bearerToken)
      
      await expect(syncJob.runSync()).resolves.toBeUndefined()
      expect(mockScheduleSyncService.syncSchedules).toHaveBeenCalled()

      delete process.env.ENABLE_SCHEDULE_SYNC
    })
  })
})
