/**
 * Unit tests for Synchronization Job Service
 * Tests sync process, status management, and error handling
 */

import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { createSyncJob, type SyncStatus } from '../../src/services/sync'
import type { UpstreamApiClient } from '../../src/services/upstream-api'

// Mock database module
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

// Mock the db import
mock.module('../db', () => ({
  db: mockDb,
}))

describe('SyncJob', () => {
  const upstreamApiUrl = 'https://api-partner.krl.co.id'
  const bearerToken = 'test-token'

  beforeEach(() => {
    // Reset all mocks before each test
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

      // Mock createUpstreamApiClient
      mock.module('./upstream-api', () => ({
        createUpstreamApiClient: () => mockApiClient,
        UpstreamApiError: class UpstreamApiError extends Error {},
      }))

      const syncJob = createSyncJob(upstreamApiUrl, bearerToken)

      await expect(syncJob.runSync()).resolves.toBeUndefined()

      // Verify API calls were made
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

      // Verify insert was called (for in_progress and success statuses)
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

      // Verify delete was called for both stations and route maps
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
})
