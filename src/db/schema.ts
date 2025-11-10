import { pgTable, varchar, integer, timestamp, serial, text } from 'drizzle-orm/pg-core'

// Stations table - stores synchronized station data
export const stations = pgTable('stations', {
  staId: varchar('sta_id', { length: 10 }).primaryKey(),
  staName: varchar('sta_name', { length: 255 }).notNull(),
  groupWil: integer('group_wil').notNull(),
  fgEnable: integer('fg_enable').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Route maps table - stores synchronized route map data
export const routeMaps = pgTable('route_maps', {
  id: serial('id').primaryKey(),
  area: integer('area').notNull(),
  permalink: varchar('permalink', { length: 500 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Sync metadata table - stores synchronization history and status
export const syncMetadata = pgTable('sync_metadata', {
  id: serial('id').primaryKey(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // 'success', 'failed', 'in_progress'
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
