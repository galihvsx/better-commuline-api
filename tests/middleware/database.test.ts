/**
 * Unit tests for Database Middleware
 * Tests database context attachment
 */

import { describe, test, expect, mock } from 'bun:test'
import { databaseMiddleware } from '../../src/middleware/database'
import type { Context, Next } from 'hono'

describe('Database Middleware', () => {
  test('should attach database instance to context', async () => {
    const middleware = databaseMiddleware()

    const mockContext = {
      set: mock(() => {}),
      get: mock(() => {}),
    } as unknown as Context

    const mockNext = mock(() => Promise.resolve())

    await middleware(mockContext, mockNext as Next)

    expect(mockContext.set).toHaveBeenCalledWith('db', expect.anything())
    expect(mockNext).toHaveBeenCalled()
  })

  test('should call next middleware', async () => {
    const middleware = databaseMiddleware()

    const mockContext = {
      set: mock(() => {}),
      get: mock(() => {}),
    } as unknown as Context

    const mockNext = mock(() => Promise.resolve())

    await middleware(mockContext, mockNext as Next)

    expect(mockNext).toHaveBeenCalledTimes(1)
  })

  test('should attach db before calling next', async () => {
    const middleware = databaseMiddleware()
    const callOrder: string[] = []

    const mockContext = {
      set: mock(() => {
        callOrder.push('set')
      }),
      get: mock(() => {}),
    } as unknown as Context

    const mockNext = mock(() => {
      callOrder.push('next')
      return Promise.resolve()
    })

    await middleware(mockContext, mockNext as Next)

    expect(callOrder).toEqual(['set', 'next'])
  })

  test('should propagate errors from next middleware', async () => {
    const middleware = databaseMiddleware()

    const mockContext = {
      set: mock(() => {}),
      get: mock(() => {}),
    } as unknown as Context

    const testError = new Error('Next middleware error')
    const mockNext = mock(() => Promise.reject(testError))

    await expect(
      middleware(mockContext, mockNext as Next)
    ).rejects.toThrow('Next middleware error')
  })
})
