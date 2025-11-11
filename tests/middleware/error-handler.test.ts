import { describe, test, expect, mock } from 'bun:test'
import { errorHandler } from '../../src/middleware/error-handler'
import { HTTPException } from 'hono/http-exception'
import type { Context } from 'hono'

describe('Error Handler Middleware', () => {
  const createMockContext = () => {
    return {
      json: mock((data: any, status: number) => ({
        data,
        status,
      })),
    } as unknown as Context
  }

  describe('HTTPException handling', () => {
    test('should handle HTTPException with correct status and message', () => {
      const c = createMockContext()
      const error = new HTTPException(400, {
        message: 'Invalid request parameter',
      })

      const result = errorHandler(error, c)

      expect(c.json).toHaveBeenCalledWith(
        {
          error: 'Invalid request parameter',
          status: 400,
        },
        400
      )
    })

    test('should handle 401 Unauthorized', () => {
      const c = createMockContext()
      const error = new HTTPException(401, {
        message: 'Unauthorized access',
      })

      errorHandler(error, c)

      expect(c.json).toHaveBeenCalledWith(
        {
          error: 'Unauthorized access',
          status: 401,
        },
        401
      )
    })

    test('should handle 404 Not Found', () => {
      const c = createMockContext()
      const error = new HTTPException(404, {
        message: 'Resource not found',
      })

      errorHandler(error, c)

      expect(c.json).toHaveBeenCalledWith(
        {
          error: 'Resource not found',
          status: 404,
        },
        404
      )
    })

    test('should handle 409 Conflict', () => {
      const c = createMockContext()
      const error = new HTTPException(409, {
        message: 'Sync is already in progress',
      })

      errorHandler(error, c)

      expect(c.json).toHaveBeenCalledWith(
        {
          error: 'Sync is already in progress',
          status: 409,
        },
        409
      )
    })

    test('should handle 503 Service Unavailable', () => {
      const c = createMockContext()
      const error = new HTTPException(503, {
        message: 'Upstream API is currently unavailable',
      })

      errorHandler(error, c)

      expect(c.json).toHaveBeenCalledWith(
        {
          error: 'Upstream API is currently unavailable',
          status: 503,
        },
        503
      )
    })
  })

  describe('Unexpected error handling', () => {
    test('should return 500 for unexpected errors', () => {
      const c = createMockContext()
      const error = new Error('Unexpected database error')

      const originalConsoleError = console.error
      console.error = mock(() => {})

      errorHandler(error, c)

      expect(c.json).toHaveBeenCalledWith(
        {
          error: 'Internal Server Error',
          status: 500,
        },
        500
      )

      console.error = originalConsoleError
    })

    test('should log unexpected errors', () => {
      const c = createMockContext()
      const error = new Error('Database connection failed')

      const consoleErrorMock = mock(() => {})
      const originalConsoleError = console.error
      console.error = consoleErrorMock

      errorHandler(error, c)

      expect(consoleErrorMock).toHaveBeenCalledWith(
        'Unhandled error:',
        error
      )

      console.error = originalConsoleError
    })

    test('should handle TypeError', () => {
      const c = createMockContext()
      const error = new TypeError('Cannot read property of undefined')

      const originalConsoleError = console.error
      console.error = mock(() => {})

      errorHandler(error, c)

      expect(c.json).toHaveBeenCalledWith(
        {
          error: 'Internal Server Error',
          status: 500,
        },
        500
      )

      console.error = originalConsoleError
    })

    test('should handle ReferenceError', () => {
      const c = createMockContext()
      const error = new ReferenceError('Variable is not defined')

      const originalConsoleError = console.error
      console.error = mock(() => {})

      errorHandler(error, c)

      expect(c.json).toHaveBeenCalledWith(
        {
          error: 'Internal Server Error',
          status: 500,
        },
        500
      )

      console.error = originalConsoleError
    })
  })

  describe('Error response format', () => {
    test('should always include error and status fields', () => {
      const c = createMockContext()
      const error = new HTTPException(400, {
        message: 'Bad request',
      })

      errorHandler(error, c)

      const callArgs = (c.json as any).mock.calls[0]
      const responseBody = callArgs[0]

      expect(responseBody).toHaveProperty('error')
      expect(responseBody).toHaveProperty('status')
      expect(typeof responseBody.error).toBe('string')
      expect(typeof responseBody.status).toBe('number')
    })

    test('should not expose internal error details for unexpected errors', () => {
      const c = createMockContext()
      const error = new Error('Internal database connection string: postgres://...')

      const originalConsoleError = console.error
      console.error = mock(() => {})

      errorHandler(error, c)

      const callArgs = (c.json as any).mock.calls[0]
      const responseBody = callArgs[0]

      expect(responseBody.error).toBe('Internal Server Error')
      expect(responseBody.error).not.toContain('postgres://')

      console.error = originalConsoleError
    })
  })
})
