import { createMiddleware } from 'hono/factory'
import { db } from '../db'

export const databaseMiddleware = () => {
  return createMiddleware(async (c, next) => {
    c.set('db', db)
    await next()
  })
}
