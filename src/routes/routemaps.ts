import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { routeMaps } from '../db/schema'
import type { db } from '../db'

type Env = {
  Variables: {
    db: typeof db
  }
}

const app = new Hono<Env>()

app.get('/', async (c) => {
  try {
    const db = c.get('db')
    const allRouteMaps = await db.select().from(routeMaps)
    
    return c.json({ data: allRouteMaps })
  } catch (error) {
    console.error('Database error while fetching route maps:', error)
    throw new HTTPException(500, {
      message: 'Failed to fetch route maps from database',
    })
  }
})

export default app
