import { rateLimiter } from 'hono-rate-limiter'
import type { Context } from 'hono'

export const createRateLimiter = () => {
  return rateLimiter({
    windowMs: 60000,
    limit: 100,
    standardHeaders: 'draft-6',
    keyGenerator: (c: Context) => {
      const forwardedFor = c.req.header('x-forwarded-for')
      if (forwardedFor) {
        return forwardedFor.split(',')[0].trim()
      }
      
      const realIp = c.req.header('x-real-ip')
      if (realIp) {
        return realIp
      }
      
      return 'unknown'
    },
  })
}
