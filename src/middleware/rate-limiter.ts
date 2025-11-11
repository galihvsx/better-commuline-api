import { rateLimiter } from 'hono-rate-limiter'
import type { Context } from 'hono'

/**
 * Rate limiter middleware configuration
 * Limits requests to 100 per minute per IP address
 */
export const createRateLimiter = () => {
  return rateLimiter({
    windowMs: 60000, // 1 minute (60000 milliseconds)
    limit: 100, // 100 requests per minute per IP
    standardHeaders: 'draft-6', // Return rate limit info in headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
    keyGenerator: (c: Context) => {
      // Extract IP from x-forwarded-for or x-real-ip headers
      // x-forwarded-for can contain multiple IPs, take the first one
      const forwardedFor = c.req.header('x-forwarded-for')
      if (forwardedFor) {
        return forwardedFor.split(',')[0].trim()
      }
      
      const realIp = c.req.header('x-real-ip')
      if (realIp) {
        return realIp
      }
      
      // Fallback to 'unknown' if no IP headers are present
      return 'unknown'
    },
  })
}
