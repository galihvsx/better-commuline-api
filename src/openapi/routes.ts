import { createRoute } from '@hono/zod-openapi'
import {
  StationsResponseSchema,
  SchedulesResponseSchema,
  FaresResponseSchema,
  RouteMapsResponseSchema,
  SyncStatusSchema,
  SyncTriggerResponseSchema,
  ErrorSchema,
  ScheduleQuerySchema,
  FareQuerySchema,
} from './schemas'

/**
 * GET /stations
 * Retrieve all synchronized station data from the database
 */
export const getStationsRoute = createRoute({
  method: 'get',
  path: '/stations',
  summary: 'Get all stations',
  description: 'Retrieve all synchronized station data from the database',
  tags: ['Stations'],
  responses: {
    200: {
      description: 'Successful response with station data',
      content: {
        'application/json': {
          schema: StationsResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

/**
 * GET /schedules
 * Retrieve train schedule data from database cache
 */
export const getSchedulesRoute = createRoute({
  method: 'get',
  path: '/schedules',
  summary: 'Get train schedules',
  description:
    'Retrieve train schedule data for a specific station and time range from the database cache. Schedule data is synchronized daily at 23:59 WIB (16:59 UTC) and covers full-day schedules (00:00-23:59). This endpoint maintains backward compatibility with the previous API structure.',
  tags: ['Schedules'],
  request: {
    query: ScheduleQuerySchema,
  },
  responses: {
    200: {
      description: 'Successful response with schedule data',
      content: {
        'application/json': {
          schema: SchedulesResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad request - invalid or missing query parameters',
      content: {
        'application/json': {
          schema: ErrorSchema,
          example: {
            error: 'stationid is required',
            status: 400,
          },
        },
      },
    },
    429: {
      description: 'Too many requests - rate limit exceeded',
      content: {
        'application/json': {
          schema: ErrorSchema,
          example: {
            error: 'Too many requests, please try again later',
            status: 429,
          },
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorSchema,
          example: {
            error: 'Internal Server Error',
            status: 500,
          },
        },
      },
    },
    503: {
      description: 'Service unavailable - upstream API is unreachable',
      content: {
        'application/json': {
          schema: ErrorSchema,
          example: {
            error: 'Upstream API is currently unavailable',
            status: 503,
          },
        },
      },
    },
  },
})

/**
 * GET /fares
 * Retrieve real-time fare data by proxying to upstream API
 */
export const getFaresRoute = createRoute({
  method: 'get',
  path: '/fares',
  summary: 'Get fare information',
  description:
    'Retrieve real-time fare information between two stations',
  tags: ['Fares'],
  request: {
    query: FareQuerySchema,
  },
  responses: {
    200: {
      description: 'Successful response with fare data',
      content: {
        'application/json': {
          schema: FaresResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad request - invalid or missing query parameters',
      content: {
        'application/json': {
          schema: ErrorSchema,
          example: {
            error: 'stationfrom is required',
            status: 400,
          },
        },
      },
    },
    429: {
      description: 'Too many requests - rate limit exceeded',
      content: {
        'application/json': {
          schema: ErrorSchema,
          example: {
            error: 'Too many requests, please try again later',
            status: 429,
          },
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorSchema,
          example: {
            error: 'Internal Server Error',
            status: 500,
          },
        },
      },
    },
    503: {
      description: 'Service unavailable - upstream API is unreachable',
      content: {
        'application/json': {
          schema: ErrorSchema,
          example: {
            error: 'Upstream API is currently unavailable',
            status: 503,
          },
        },
      },
    },
  },
})

/**
 * GET /routemaps
 * Retrieve all synchronized route map data from the database
 */
export const getRouteMapsRoute = createRoute({
  method: 'get',
  path: '/routemaps',
  summary: 'Get route maps',
  description: 'Retrieve all synchronized route map data from the database',
  tags: ['Route Maps'],
  responses: {
    200: {
      description: 'Successful response with route map data',
      content: {
        'application/json': {
          schema: RouteMapsResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

/**
 * GET /sync-status
 * Retrieve synchronization metadata
 */
export const getSyncStatusRoute = createRoute({
  method: 'get',
  path: '/sync-status',
  summary: 'Get sync status',
  description:
    'Retrieve the latest synchronization metadata including timestamp, status, and error message if failed',
  tags: ['Synchronization'],
  responses: {
    200: {
      description: 'Successful response with sync status',
      content: {
        'application/json': {
          schema: SyncStatusSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

/**
 * POST /sync
 * Manually trigger a data synchronization
 * NOTE: This route is functional but hidden from OpenAPI documentation
 */
export const postSyncRoute = createRoute({
  method: 'post',
  path: '/sync',
  summary: 'Trigger manual sync',
  description:
    'Manually trigger a full data synchronization including stations, route maps, and schedules. Returns 409 if sync is already in progress.',
  tags: ['Synchronization'],
  responses: {
    202: {
      description: 'Sync has started successfully',
      content: {
        'application/json': {
          schema: SyncTriggerResponseSchema,
        },
      },
    },
    409: {
      description: 'Conflict - sync is already in progress',
      content: {
        'application/json': {
          schema: ErrorSchema,
          example: {
            error: 'Sync is already in progress',
            status: 409,
          },
        },
      },
    },
    429: {
      description: 'Too many requests - rate limit exceeded',
      content: {
        'application/json': {
          schema: ErrorSchema,
          example: {
            error: 'Too many requests, please try again later',
            status: 429,
          },
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

/**
 * POST /sync/schedules
 * Manually trigger schedule synchronization only
 */
export const postScheduleSyncRoute = createRoute({
  method: 'post',
  path: '/sync/schedules',
  summary: 'Trigger schedule sync',
  description:
    'Manually trigger schedule synchronization for all active stations. Fetches full-day schedules (00:00-23:59) from upstream API and updates the database cache. Returns 409 if sync is already in progress.',
  tags: ['Synchronization'],
  responses: {
    202: {
      description: 'Schedule sync has started successfully',
      content: {
        'application/json': {
          schema: SyncTriggerResponseSchema,
        },
      },
    },
    409: {
      description: 'Conflict - sync is already in progress',
      content: {
        'application/json': {
          schema: ErrorSchema,
          example: {
            error: 'Sync is already in progress',
            status: 409,
          },
        },
      },
    },
    429: {
      description: 'Too many requests - rate limit exceeded',
      content: {
        'application/json': {
          schema: ErrorSchema,
          example: {
            error: 'Too many requests, please try again later',
            status: 429,
          },
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})
