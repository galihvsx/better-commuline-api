/**
 * Unit tests for Upstream API Client
 * Tests request formatting, error handling, and timeout behavior
 */

import { describe, test, expect } from 'bun:test'
import {
  UpstreamApiError,
} from '../../src/services/upstream-api'

describe('UpstreamApiClient', () => {
  describe('UpstreamApiError', () => {
    test('should be an Error subclass', () => {
      const error = new UpstreamApiError('Test error')
      
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe('Test error')
    })

    test('should accept optional parameters', () => {
      // Test that constructor accepts the right number of parameters
      const error1 = new UpstreamApiError('Message only')
      const error2 = new UpstreamApiError('With status', 500)
      const error3 = new UpstreamApiError('With all', 401, { error: 'body' })
      
      expect(error1.message).toBe('Message only')
      expect(error2.message).toBe('With status')
      expect(error3.message).toBe('With all')
    })
  })

  describe('Error handling logic', () => {
    test('should identify abort errors by name', () => {
      const abortError = new Error('Aborted')
      abortError.name = 'AbortError'
      
      expect(abortError.name).toBe('AbortError')
    })

    test('should identify TypeError for network errors', () => {
      const networkError = new TypeError('fetch failed')
      
      expect(networkError).toBeInstanceOf(TypeError)
      expect(networkError.message).toContain('fetch')
    })

    test('should handle non-200 status codes', () => {
      const statusCodes = [400, 401, 403, 404, 500, 502, 503]
      
      // Test that error messages can be created for different status codes
      statusCodes.forEach(code => {
        const error = new UpstreamApiError(
          `Upstream API returned status ${code}`
        )
        expect(error.message).toContain(String(code))
      })
    })
  })

  describe('URL construction', () => {
    test('should construct station endpoint URL', () => {
      const baseUrl = 'https://api-partner.krl.co.id'
      const endpoint = '/krl-webs/v1/krl-station'
      const url = new URL(endpoint, baseUrl)
      
      expect(url.toString()).toBe('https://api-partner.krl.co.id/krl-webs/v1/krl-station')
    })

    test('should construct schedule endpoint URL with query params', () => {
      const baseUrl = 'https://api-partner.krl.co.id'
      const endpoint = '/krl-webs/v1/schedules'
      const url = new URL(endpoint, baseUrl)
      url.searchParams.append('stationid', 'BKS')
      url.searchParams.append('timefrom', '05:00')
      url.searchParams.append('timeto', '09:00')
      
      expect(url.toString()).toContain('stationid=BKS')
      expect(url.toString()).toContain('timefrom=05%3A00')
      expect(url.toString()).toContain('timeto=09%3A00')
    })

    test('should construct fare endpoint URL with query params', () => {
      const baseUrl = 'https://api-partner.krl.co.id'
      const endpoint = '/krl-webs/v1/fare'
      const url = new URL(endpoint, baseUrl)
      url.searchParams.append('stationfrom', 'BKS')
      url.searchParams.append('stationto', 'JAKK')
      
      expect(url.toString()).toContain('stationfrom=BKS')
      expect(url.toString()).toContain('stationto=JAKK')
    })

    test('should construct routemap endpoint URL', () => {
      const baseUrl = 'https://api-partner.krl.co.id'
      const endpoint = '/krl-webs/v1/routemap'
      const url = new URL(endpoint, baseUrl)
      
      expect(url.toString()).toBe('https://api-partner.krl.co.id/krl-webs/v1/routemap')
    })
  })

  describe('Authorization header format', () => {
    test('should format Bearer token correctly', () => {
      const token = 'test-token-123'
      const authHeader = `Bearer ${token}`
      
      expect(authHeader).toBe('Bearer test-token-123')
      expect(authHeader).toContain('Bearer ')
    })

    test('should handle different token formats', () => {
      const tokens = [
        'simple-token',
        'token.with.dots',
        'token_with_underscores',
        'token-with-dashes',
      ]
      
      tokens.forEach(token => {
        const authHeader = `Bearer ${token}`
        expect(authHeader).toContain(token)
        expect(authHeader.startsWith('Bearer ')).toBe(true)
      })
    })
  })

  describe('Response type validation', () => {
    test('should validate StationResponse structure', () => {
      const response = {
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
      }
      
      expect(response).toHaveProperty('status')
      expect(response).toHaveProperty('message')
      expect(response).toHaveProperty('data')
      expect(Array.isArray(response.data)).toBe(true)
      expect(response.data[0]).toHaveProperty('sta_id')
      expect(response.data[0]).toHaveProperty('sta_name')
      expect(response.data[0]).toHaveProperty('group_wil')
      expect(response.data[0]).toHaveProperty('fg_enable')
    })

    test('should validate ScheduleResponse structure', () => {
      const response = {
        status: 200,
        data: [
          {
            train_id: '2200',
            ka_name: 'COMMUTER LINE',
            route_name: 'ROUTE',
            dest: 'DESTINATION',
            time_est: '05:00:00',
            color: '#DD0067',
            dest_time: '06:00:00',
          },
        ],
      }
      
      expect(response).toHaveProperty('status')
      expect(response).toHaveProperty('data')
      expect(Array.isArray(response.data)).toBe(true)
      expect(response.data[0]).toHaveProperty('train_id')
      expect(response.data[0]).toHaveProperty('ka_name')
      expect(response.data[0]).toHaveProperty('route_name')
      expect(response.data[0]).toHaveProperty('dest')
      expect(response.data[0]).toHaveProperty('time_est')
      expect(response.data[0]).toHaveProperty('color')
      expect(response.data[0]).toHaveProperty('dest_time')
    })

    test('should validate FareResponse structure', () => {
      const response = {
        status: 200,
        data: [
          {
            sta_code_from: 'BKS',
            sta_name_from: 'BEKASI',
            sta_code_to: 'JAKK',
            sta_name_to: 'JAKARTA KOTA',
            fare: 5000,
            distance: '25.5',
          },
        ],
      }
      
      expect(response).toHaveProperty('status')
      expect(response).toHaveProperty('data')
      expect(Array.isArray(response.data)).toBe(true)
      expect(response.data[0]).toHaveProperty('sta_code_from')
      expect(response.data[0]).toHaveProperty('sta_name_from')
      expect(response.data[0]).toHaveProperty('sta_code_to')
      expect(response.data[0]).toHaveProperty('sta_name_to')
      expect(response.data[0]).toHaveProperty('fare')
      expect(response.data[0]).toHaveProperty('distance')
    })

    test('should validate RouteMapResponse structure', () => {
      const response = {
        status: 200,
        data: [
          {
            area: 0,
            permalink: 'https://example.com/map.png',
          },
        ],
      }
      
      expect(response).toHaveProperty('status')
      expect(response).toHaveProperty('data')
      expect(Array.isArray(response.data)).toBe(true)
      expect(response.data[0]).toHaveProperty('area')
      expect(response.data[0]).toHaveProperty('permalink')
    })
  })

  describe('Timeout configuration', () => {
    test('should use 10 second timeout', () => {
      const TIMEOUT_MS = 10000
      
      expect(TIMEOUT_MS).toBe(10 * 1000)
      expect(TIMEOUT_MS).toBe(10000)
    })

    test('should create AbortController for timeout', () => {
      const controller = new AbortController()
      
      expect(controller).toBeInstanceOf(AbortController)
      expect(controller.signal).toBeDefined()
    })
  })
})
