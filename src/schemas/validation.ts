import { z } from 'zod'

/**
 * Validation schema for schedule query parameters
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
export const scheduleQuerySchema = z.object({
  stationid: z
    .string({
      required_error: 'stationid is required',
      invalid_type_error: 'stationid must be a string',
    })
    .min(1, 'stationid cannot be empty'),
  timefrom: z
    .string({
      required_error: 'timefrom is required',
      invalid_type_error: 'timefrom must be a string',
    })
    .regex(
      /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
      'timefrom must be in HH:mm format (e.g., 05:00, 23:59)'
    ),
  timeto: z
    .string({
      required_error: 'timeto is required',
      invalid_type_error: 'timeto must be a string',
    })
    .regex(
      /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
      'timeto must be in HH:mm format (e.g., 05:00, 23:59)'
    ),
})

/**
 * Validation schema for fare query parameters
 * Requirements: 8.1, 8.2, 8.3
 */
export const fareQuerySchema = z.object({
  stationfrom: z
    .string({
      required_error: 'stationfrom is required',
      invalid_type_error: 'stationfrom must be a string',
    })
    .min(1, 'stationfrom cannot be empty'),
  stationto: z
    .string({
      required_error: 'stationto is required',
      invalid_type_error: 'stationto must be a string',
    })
    .min(1, 'stationto cannot be empty'),
})

/**
 * Type definitions for validated query parameters
 */
export type ScheduleQuery = z.infer<typeof scheduleQuerySchema>
export type FareQuery = z.infer<typeof fareQuerySchema>
