import { z } from '@hono/zod-openapi'

export const StationSchema = z.object({
  sta_id: z.string().openapi({
    example: 'BKS',
    description: 'Station ID',
  }),
  sta_name: z.string().openapi({
    example: 'BEKASI',
    description: 'Station name',
  }),
  group_wil: z.number().openapi({
    example: 0,
    description: 'Regional group (0 for Jabodetabek, 6 for Yogyakarta)',
  }),
  fg_enable: z.number().openapi({
    example: 1,
    description: 'Enable flag (1 = active, 0 = inactive)',
  }),
})

export const ScheduleSchema = z.object({
  train_id: z.string().openapi({
    example: '2200',
    description: 'Train identifier',
  }),
  ka_name: z.string().openapi({
    example: 'COMMUTER LINE TANJUNGPRIUK',
    description: 'Train line name',
  }),
  route_name: z.string().openapi({
    example: 'JAKARTAKOTA-TANJUNGPRIUK',
    description: 'Route name',
  }),
  dest: z.string().openapi({
    example: 'TANJUNGPRIUK',
    description: 'Destination station name',
  }),
  time_est: z.string().openapi({
    example: '05:07:00',
    description: 'Estimated departure time (HH:mm:ss format)',
  }),
  color: z.string().openapi({
    example: '#DD0067',
    description: 'Line color hex code',
  }),
  dest_time: z.string().openapi({
    example: '05:16:00',
    description: 'Estimated arrival time at destination (HH:mm:ss format)',
  }),
})

export const FareSchema = z.object({
  sta_code_from: z.string().openapi({
    example: 'BKS',
    description: 'Origin station ID',
  }),
  sta_name_from: z.string().openapi({
    example: 'BEKASI',
    description: 'Origin station name',
  }),
  sta_code_to: z.string().openapi({
    example: 'KMO',
    description: 'Destination station ID',
  }),
  sta_name_to: z.string().openapi({
    example: 'KEMAYORAN',
    description: 'Destination station name',
  }),
  fare: z.number().openapi({
    example: 5000,
    description: 'Ticket price in IDR',
  }),
  distance: z.string().openapi({
    example: '25.5',
    description: 'Distance in kilometers',
  }),
})

export const RouteMapSchema = z.object({
  area: z.number().openapi({
    example: 1,
    description: 'Area identifier',
  }),
  permalink: z.string().openapi({
    example: 'https://example.com/map.png',
    description: 'URL to route map image',
  }),
})

export const SyncStatusSchema = z.object({
  timestamp: z.string().nullable().openapi({
    example: '2024-01-15T23:59:00+07:00',
    description: 'ISO 8601 timestamp with WIB timezone of last sync',
  }),
  status: z.string().openapi({
    example: 'success',
    description: 'Sync status (success, failed, in_progress, never_synced)',
  }),
  error: z.string().optional().openapi({
    example: 'Connection timeout',
    description: 'Error message if status is failed',
  }),
  message: z.string().optional().openapi({
    example: 'No synchronization has been performed yet',
    description: 'Additional status message',
  }),
})

export const ErrorSchema = z.object({
  error: z.string().openapi({
    example: 'stationid is required',
    description: 'Descriptive error message',
  }),
  status: z.number().openapi({
    example: 400,
    description: 'HTTP status code',
  }),
})

export const StationsResponseSchema = z.object({
  data: z.array(StationSchema),
})

export const SchedulesResponseSchema = z.object({
  status: z.number().openapi({
    example: 200,
    description: 'Response status code',
  }),
  data: z.array(ScheduleSchema),
})

export const FaresResponseSchema = z.object({
  status: z.number().openapi({
    example: 200,
    description: 'Response status code',
  }),
  data: z.array(FareSchema),
})

export const RouteMapsResponseSchema = z.object({
  data: z.array(RouteMapSchema),
})

export const SyncTriggerResponseSchema = z.object({
  message: z.string().openapi({
    example: 'Sync has started',
    description: 'Status message',
  }),
})

export const ScheduleQuerySchema = z.object({
  stationid: z.string().openapi({
    param: {
      name: 'stationid',
      in: 'query',
      required: true,
      example: 'BKS',
      description: 'Station ID',
    },
  }),
  timefrom: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).openapi({
    param: {
      name: 'timefrom',
      in: 'query',
      required: true,
      example: '05:00',
      description: 'Start time in HH:mm format',
    },
  }),
  timeto: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).openapi({
    param: {
      name: 'timeto',
      in: 'query',
      required: true,
      example: '09:00',
      description: 'End time in HH:mm format',
    },
  }),
})

export const FareQuerySchema = z.object({
  stationfrom: z.string().openapi({
    param: {
      name: 'stationfrom',
      in: 'query',
      required: true,
      example: 'BKS',
      description: 'Origin station ID',
    },
  }),
  stationto: z.string().openapi({
    param: {
      name: 'stationto',
      in: 'query',
      required: true,
      example: 'KMO',
      description: 'Destination station ID',
    },
  }),
})
