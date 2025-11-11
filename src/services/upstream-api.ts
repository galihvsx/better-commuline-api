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
  sendPreflightRequest(url: string): Promise<boolean>
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
  const TIMEOUT_MS = 10000

  async function makeRequest<T>(
    endpoint: string,
    queryParams?: Record<string, string>
  ): Promise<T> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const url = new URL(endpoint, baseUrl)
      if (queryParams) {
        Object.entries(queryParams).forEach(([key, value]) => {
          url.searchParams.append(key, value)
        })
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const responseBody = await response.text()
        throw new UpstreamApiError(
          `Upstream API returned status ${response.status}`,
          response.status,
          responseBody
        )
      }

      return (await response.json()) as T
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw new UpstreamApiError(
          'Request timeout after 10 seconds',
          undefined,
          undefined
        )
      }

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

      if (error instanceof UpstreamApiError) {
        throw error
      }

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

    async sendPreflightRequest(url: string): Promise<boolean> {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

      try {
        const response = await fetch(url, {
          method: 'OPTIONS',
          headers: {
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'authorization',
            Authorization: `Bearer ${bearerToken}`,
          },
          credentials: 'include',
          mode: 'cors',
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new UpstreamApiError(
            `Preflight request failed with status ${response.status}`,
            response.status,
            undefined
          )
        }

        return true
      } catch (error) {
        clearTimeout(timeoutId)

        if (error instanceof Error && error.name === 'AbortError') {
          throw new UpstreamApiError(
            'Preflight request timeout after 10 seconds',
            undefined,
            undefined
          )
        }

        if (
          error instanceof TypeError &&
          error.message.includes('fetch')
        ) {
          throw new UpstreamApiError(
            'Network error: Unable to reach upstream API for preflight',
            undefined,
            undefined
          )
        }

        if (error instanceof UpstreamApiError) {
          throw error
        }

        throw new UpstreamApiError(
          `Preflight request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          undefined,
          undefined
        )
      }
    },
  }
}
