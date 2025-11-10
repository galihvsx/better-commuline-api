/**
 * Upstream API Client for Indonesian Commuterline API
 * Base URL: https://api-partner.krl.co.id
 */

export interface StationResponse {
  status: number
  message: string
  data: Array<{
    sta_id: string
    sta_name: string
    group_wil: number
    fg_enable: number
  }>
}

export interface ScheduleResponse {
  status: number
  data: Array<{
    train_id: string
    ka_name: string
    route_name: string
    dest: string
    time_est: string
    color: string
    dest_time: string
  }>
}

export interface FareResponse {
  status: number
  data: Array<{
    sta_code_from: string
    sta_name_from: string
    sta_code_to: string
    sta_name_to: string
    fare: number
    distance: string
  }>
}

export interface RouteMapResponse {
  status: number
  data: Array<{
    area: number
    permalink: string
  }>
}

export interface UpstreamApiClient {
  getStations(): Promise<StationResponse>
  getSchedules(
    stationId: string,
    timeFrom: string,
    timeTo: string
  ): Promise<ScheduleResponse>
  getFare(
    stationFrom: string,
    stationTo: string
  ): Promise<FareResponse>
  getRouteMaps(): Promise<RouteMapResponse>
}

export class UpstreamApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public responseBody?: unknown
  ) {
    super(message)
    this.name = 'UpstreamApiError'
  }
}

export function createUpstreamApiClient(
  baseUrl: string,
  bearerToken: string
): UpstreamApiClient {
  const TIMEOUT_MS = 10000 // 10 seconds

  /**
   * Makes an HTTP request with timeout and error handling
   */
  async function makeRequest<T>(
    endpoint: string,
    queryParams?: Record<string, string>
  ): Promise<T> {
    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      // Build URL with query parameters
      const url = new URL(endpoint, baseUrl)
      if (queryParams) {
        Object.entries(queryParams).forEach(([key, value]) => {
          url.searchParams.append(key, value)
        })
      }

      // Make request with Bearer token authentication
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
        signal: controller.signal,
      })

      // Clear timeout
      clearTimeout(timeoutId)

      // Handle non-200 responses
      if (!response.ok) {
        const responseBody = await response.text()
        throw new UpstreamApiError(
          `Upstream API returned status ${response.status}`,
          response.status,
          responseBody
        )
      }

      // Parse and return JSON response
      return (await response.json()) as T
    } catch (error) {
      // Clear timeout in case of error
      clearTimeout(timeoutId)

      // Handle abort/timeout errors
      if (error instanceof Error && error.name === 'AbortError') {
        throw new UpstreamApiError(
          'Request timeout after 10 seconds',
          undefined,
          undefined
        )
      }

      // Handle network errors
      if (
        error instanceof TypeError &&
        error.message.includes('fetch')
      ) {
        throw new UpstreamApiError(
          'Network error: Unable to reach upstream API',
          undefined,
          undefined
        )
      }

      // Re-throw UpstreamApiError as-is
      if (error instanceof UpstreamApiError) {
        throw error
      }

      // Handle other errors
      throw new UpstreamApiError(
        `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        undefined
      )
    }
  }

  return {
    async getStations(): Promise<StationResponse> {
      return makeRequest<StationResponse>('/krl-webs/v1/krl-station')
    },

    async getSchedules(
      stationId: string,
      timeFrom: string,
      timeTo: string
    ): Promise<ScheduleResponse> {
      return makeRequest<ScheduleResponse>('/krl-webs/v1/schedules', {
        stationid: stationId,
        timefrom: timeFrom,
        timeto: timeTo,
      })
    },

    async getFare(
      stationFrom: string,
      stationTo: string
    ): Promise<FareResponse> {
      return makeRequest<FareResponse>('/krl-webs/v1/fare', {
        stationfrom: stationFrom,
        stationto: stationTo,
      })
    },

    async getRouteMaps(): Promise<RouteMapResponse> {
      return makeRequest<RouteMapResponse>('/krl-webs/v1/routemap')
    },
  }
}
