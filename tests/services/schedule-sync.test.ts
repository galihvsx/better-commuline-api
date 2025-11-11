import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { createScheduleSyncService } from '../../src/services/schedule-sync'
import type { UpstreamApiClient } from '../../src/services/upstream-api'

describe('ScheduleSyncService', () => {
  const upstreamApiUrl = 'https://api-partner.krl.co.id'
  const bearerToken = 'test-token'

  beforeEach(() => {
    mock.restore()
  })

  describe('syncScheduleForStation', () => {
    test('should sync single station successfully', async () => {
      const mockApiClient: UpstreamApiClient = {
        getStations: mock(() => Promise.resolve({ status: 200, message: 'Success', data: [] })),
        getRouteMaps: mock(() => Promise.resolve({ status: 200, data: [] })),
        getSchedules: mock(() =>
          Promise.resolve({
            status: 200,
            data: [
              {
                train_id: '1234',
                ka_name: 'Commuter Line',
                route_name: 'BOGOR-JAKARTA KOTA',
                dest: 'JAKARTA KOTA',
                time_est: '08:00',
                dest_time: '09:30',
                color: '#FF0000',
              },
            ],
          })
        ),
        getFare: mock(() => Promise.resolve({ status: 200, data: [] })),
        sendPreflightRequest: mock(() => Promise.resolve(true)),
      }

      const allStations = [
        { staId: 'BGR', staName: 'BOGOR', groupWil: 0, fgEnable: 1 },
        { staId: 'JKK', staName: 'JAKARTA KOTA', groupWil: 0, fgEnable: 1 },
      ]

      const mockDbWithStations = {
        select: mock(() => ({
          from: mock(() => Promise.resolve(allStations)),
        })),
        insert: mock(() => ({
          values: mock(() => ({
            onConflictDoUpdate: mock(() => Promise.resolve()),
          })),
        })),
        update: mock(() => ({
          set: mock(() => ({
            where: mock(() => Promise.resolve()),
          })),
        })),
      }

      mock.module('../../src/db', () => ({
        db: mockDbWithStations,
      }))

      mock.module('../../src/services/upstream-api', () => ({
        createUpstreamApiClient: () => mockApiClient,
        UpstreamApiError: class UpstreamApiError extends Error {
          constructor(
            message: string,
            public statusCode?: number,
            public responseBody?: unknown
          ) {
            super(message)
            this.name = 'UpstreamApiError'
          }
        },
      }))

      const service = createScheduleSyncService(upstreamApiUrl, bearerToken)
      const count = await service.syncScheduleForStation('BGR')

      expect(count).toBe(1)
      expect(mockApiClient.sendPreflightRequest).toHaveBeenCalled()
      expect(mockApiClient.getSchedules).toHaveBeenCalledWith('BGR', '00:00', '23:59')
    })

    test('should handle 404 response and mark station inactive', async () => {
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
        getStations: mock(() => Promise.resolve({ status: 200, message: 'Success', data: [] })),
        getRouteMaps: mock(() => Promise.resolve({ status: 200, data: [] })),
        getSchedules: mock(() => {
          throw new UpstreamApiError('Not Found', 404)
        }),
        getFare: mock(() => Promise.resolve({ status: 200, data: [] })),
        sendPreflightRequest: mock(() => Promise.resolve(true)),
      }

      const updateMock = mock(() => ({
        set: mock(() => ({
          where: mock(() => Promise.resolve()),
        })),
      }))

      const mockDbWithUpdate = {
        select: mock(() => ({
          from: mock(() => Promise.resolve([])),
        })),
        insert: mock(() => ({
          values: mock(() => ({
            onConflictDoUpdate: mock(() => Promise.resolve()),
          })),
        })),
        update: updateMock,
      }

      mock.module('../../src/db', () => ({
        db: mockDbWithUpdate,
      }))

      mock.module('../../src/services/upstream-api', () => ({
        createUpstreamApiClient: () => mockApiClient,
        UpstreamApiError,
      }))

      const service = createScheduleSyncService(upstreamApiUrl, bearerToken)
      const count = await service.syncScheduleForStation('INVALID')

      expect(count).toBe(0)
      expect(updateMock).toHaveBeenCalled()
    })

    test('should handle empty schedule data', async () => {
      const mockApiClient: UpstreamApiClient = {
        getStations: mock(() => Promise.resolve({ status: 200, message: 'Success', data: [] })),
        getRouteMaps: mock(() => Promise.resolve({ status: 200, data: [] })),
        getSchedules: mock(() =>
          Promise.resolve({
            status: 200,
            data: [],
          })
        ),
        getFare: mock(() => Promise.resolve({ status: 200, data: [] })),
        sendPreflightRequest: mock(() => Promise.resolve(true)),
      }

      const mockDb = {
        select: mock(() => ({
          from: mock(() => Promise.resolve([])),
        })),
        insert: mock(() => ({
          values: mock(() => ({
            onConflictDoUpdate: mock(() => Promise.resolve()),
          })),
        })),
        update: mock(() => ({
          set: mock(() => ({
            where: mock(() => Promise.resolve()),
          })),
        })),
      }

      mock.module('../../src/db', () => ({
        db: mockDb,
      }))

      mock.module('../../src/services/upstream-api', () => ({
        createUpstreamApiClient: () => mockApiClient,
        UpstreamApiError: class UpstreamApiError extends Error {},
      }))

      const service = createScheduleSyncService(upstreamApiUrl, bearerToken)
      const count = await service.syncScheduleForStation('BGR')

      expect(count).toBe(0)
    })

    test('should throw error for non-404 upstream API errors', async () => {
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
        getStations: mock(() => Promise.resolve({ status: 200, message: 'Success', data: [] })),
        getRouteMaps: mock(() => Promise.resolve({ status: 200, data: [] })),
        getSchedules: mock(() => {
          throw new UpstreamApiError('Server Error', 500, 'Internal Server Error')
        }),
        getFare: mock(() => Promise.resolve({ status: 200, data: [] })),
        sendPreflightRequest: mock(() => Promise.resolve(true)),
      }

      const mockDb = {
        select: mock(() => ({
          from: mock(() => Promise.resolve([])),
        })),
        insert: mock(() => ({
          values: mock(() => ({
            onConflictDoUpdate: mock(() => Promise.resolve()),
          })),
        })),
        update: mock(() => ({
          set: mock(() => ({
            where: mock(() => Promise.resolve()),
          })),
        })),
      }

      mock.module('../../src/db', () => ({
        db: mockDb,
      }))

      mock.module('../../src/services/upstream-api', () => ({
        createUpstreamApiClient: () => mockApiClient,
        UpstreamApiError,
      }))

      const service = createScheduleSyncService(upstreamApiUrl, bearerToken)

      await expect(service.syncScheduleForStation('BGR')).rejects.toThrow()
    })
  })

  describe('syncSchedules', () => {
    test('should process stations in batches', async () => {
      const mockApiClient: UpstreamApiClient = {
        getStations: mock(() => Promise.resolve({ status: 200, message: 'Success', data: [] })),
        getRouteMaps: mock(() => Promise.resolve({ status: 200, data: [] })),
        getSchedules: mock(() =>
          Promise.resolve({
            status: 200,
            data: [],
          })
        ),
        getFare: mock(() => Promise.resolve({ status: 200, data: [] })),
        sendPreflightRequest: mock(() => Promise.resolve(true)),
      }

      const stations = Array.from({ length: 12 }, (_, i) => ({
        staId: `ST${i}`,
        staName: `Station ${i}`,
        groupWil: 0,
        fgEnable: 1,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))

      const mockDbWithStations = {
        select: mock(() => ({
          from: mock((table: any) => {
            if (table && table.staId) {
              return {
                where: mock(() => Promise.resolve(stations)),
              }
            }
            return Promise.resolve([])
          }),
        })),
        insert: mock(() => ({
          values: mock(() => ({
            onConflictDoUpdate: mock(() => Promise.resolve()),
          })),
        })),
        update: mock(() => ({
          set: mock(() => ({
            where: mock(() => Promise.resolve()),
          })),
        })),
      }

      mock.module('../../src/db', () => ({
        db: mockDbWithStations,
      }))

      mock.module('../../src/services/upstream-api', () => ({
        createUpstreamApiClient: () => mockApiClient,
        UpstreamApiError: class UpstreamApiError extends Error {},
      }))

      const service = createScheduleSyncService(upstreamApiUrl, bearerToken)
      await service.syncSchedules()

      expect(mockApiClient.getSchedules).toHaveBeenCalled()
    }, 70000)

    test('should continue processing on individual station failures', async () => {
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

      let callCount = 0
      const mockApiClient: UpstreamApiClient = {
        getStations: mock(() => Promise.resolve({ status: 200, message: 'Success', data: [] })),
        getRouteMaps: mock(() => Promise.resolve({ status: 200, data: [] })),
        getSchedules: mock(() => {
          callCount++
          if (callCount === 2) {
            throw new UpstreamApiError('Server Error', 500)
          }
          return Promise.resolve({
            status: 200,
            data: [],
          })
        }),
        getFare: mock(() => Promise.resolve({ status: 200, data: [] })),
        sendPreflightRequest: mock(() => Promise.resolve(true)),
      }

      const stations = [
        { staId: 'ST1', staName: 'Station 1', groupWil: 0, fgEnable: 1, metadata: null, createdAt: new Date(), updatedAt: new Date() },
        { staId: 'ST2', staName: 'Station 2', groupWil: 0, fgEnable: 1, metadata: null, createdAt: new Date(), updatedAt: new Date() },
        { staId: 'ST3', staName: 'Station 3', groupWil: 0, fgEnable: 1, metadata: null, createdAt: new Date(), updatedAt: new Date() },
      ]

      const mockDbWithStations = {
        select: mock(() => ({
          from: mock((table: any) => {
            if (table && table.staId) {
              return {
                where: mock(() => Promise.resolve(stations)),
              }
            }
            return Promise.resolve([])
          }),
        })),
        insert: mock(() => ({
          values: mock(() => ({
            onConflictDoUpdate: mock(() => Promise.resolve()),
          })),
        })),
        update: mock(() => ({
          set: mock(() => ({
            where: mock(() => Promise.resolve()),
          })),
        })),
      }

      mock.module('../../src/db', () => ({
        db: mockDbWithStations,
      }))

      mock.module('../../src/services/upstream-api', () => ({
        createUpstreamApiClient: () => mockApiClient,
        UpstreamApiError,
      }))

      const service = createScheduleSyncService(upstreamApiUrl, bearerToken)
      await service.syncSchedules()

      expect(mockApiClient.getSchedules).toHaveBeenCalled()
    }, 30000)
  })

  describe('upsert behavior', () => {
    test('should insert new schedule records', async () => {
      const mockApiClient: UpstreamApiClient = {
        getStations: mock(() => Promise.resolve({ status: 200, message: 'Success', data: [] })),
        getRouteMaps: mock(() => Promise.resolve({ status: 200, data: [] })),
        getSchedules: mock(() =>
          Promise.resolve({
            status: 200,
            data: [
              {
                train_id: '1234',
                ka_name: 'Commuter Line',
                route_name: 'BOGOR-JAKARTA KOTA',
                dest: 'JAKARTA KOTA',
                time_est: '08:00',
                dest_time: '09:30',
                color: '#FF0000',
              },
            ],
          })
        ),
        getFare: mock(() => Promise.resolve({ status: 200, data: [] })),
        sendPreflightRequest: mock(() => Promise.resolve(true)),
      }

      const insertMock = mock(() => ({
        values: mock(() => ({
          onConflictDoUpdate: mock(() => Promise.resolve()),
        })),
      }))

      const allStations = [
        { staId: 'BGR', staName: 'BOGOR', groupWil: 0, fgEnable: 1 },
        { staId: 'JKK', staName: 'JAKARTA KOTA', groupWil: 0, fgEnable: 1 },
      ]

      const mockDbWithInsert = {
        select: mock(() => ({
          from: mock(() => Promise.resolve(allStations)),
        })),
        insert: insertMock,
        update: mock(() => ({
          set: mock(() => ({
            where: mock(() => Promise.resolve()),
          })),
        })),
      }

      mock.module('../../src/db', () => ({
        db: mockDbWithInsert,
      }))

      mock.module('../../src/services/upstream-api', () => ({
        createUpstreamApiClient: () => mockApiClient,
        UpstreamApiError: class UpstreamApiError extends Error {},
      }))

      const service = createScheduleSyncService(upstreamApiUrl, bearerToken)
      await service.syncScheduleForStation('BGR')

      expect(insertMock).toHaveBeenCalled()
    })

    test('should update existing schedule records on conflict', async () => {
      const mockApiClient: UpstreamApiClient = {
        getStations: mock(() => Promise.resolve({ status: 200, message: 'Success', data: [] })),
        getRouteMaps: mock(() => Promise.resolve({ status: 200, data: [] })),
        getSchedules: mock(() =>
          Promise.resolve({
            status: 200,
            data: [
              {
                train_id: '1234',
                ka_name: 'Commuter Line Updated',
                route_name: 'BOGOR-JAKARTA KOTA',
                dest: 'JAKARTA KOTA',
                time_est: '08:15',
                dest_time: '09:45',
                color: '#00FF00',
              },
            ],
          })
        ),
        getFare: mock(() => Promise.resolve({ status: 200, data: [] })),
        sendPreflightRequest: mock(() => Promise.resolve(true)),
      }

      const onConflictMock = mock(() => Promise.resolve())
      const valuesMock = mock(() => ({
        onConflictDoUpdate: onConflictMock,
      }))

      const allStations = [
        { staId: 'BGR', staName: 'BOGOR', groupWil: 0, fgEnable: 1 },
        { staId: 'JKK', staName: 'JAKARTA KOTA', groupWil: 0, fgEnable: 1 },
      ]

      const mockDbWithConflict = {
        select: mock(() => ({
          from: mock(() => Promise.resolve(allStations)),
        })),
        insert: mock(() => ({
          values: valuesMock,
        })),
        update: mock(() => ({
          set: mock(() => ({
            where: mock(() => Promise.resolve()),
          })),
        })),
      }

      mock.module('../../src/db', () => ({
        db: mockDbWithConflict,
      }))

      mock.module('../../src/services/upstream-api', () => ({
        createUpstreamApiClient: () => mockApiClient,
        UpstreamApiError: class UpstreamApiError extends Error {},
      }))

      const service = createScheduleSyncService(upstreamApiUrl, bearerToken)
      await service.syncScheduleForStation('BGR')

      expect(onConflictMock).toHaveBeenCalled()
    })
  })
})
