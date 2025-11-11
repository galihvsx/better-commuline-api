import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { stations } from '../db/schema'
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
    const allStations = await db.select().from(stations)
    
    return c.json({ data: allStations })
  } catch (error) {
    console.error('Database error while fetching stations:', error)
    throw new HTTPException(500, {
      message: 'Failed to fetch stations from database',
    })
  }
})

export default app
