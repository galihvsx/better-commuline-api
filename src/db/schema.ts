import { pgTable, varchar, integer, timestamp, serial, text, index } from 'drizzle-orm/pg-core'

// Stations table - stores synchronized station data
export const stations = pgTable('stations', {
  staId: varchar('sta_id', { length: 10 }).primaryKey(),
  staName: varchar('sta_name', { length: 255 }).notNull(),
  groupWil: integer('group_wil').notNull(),
  fgEnable: integer('fg_enable').notNull(),
  metadata: text('metadata'), // JSON string for additional data like active status
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Schedules table - stores cached schedule data for all stations
export const schedules = pgTable('schedules', {
  // Primary key: unique identifier for each schedule entry
  id: varchar('id', { length: 100 }).primaryKey(),
  
  // Foreign key to stations table
  stationId: varchar('station_id', { length: 10 })
    .notNull()
    .references(() => stations.staId, { onDelete: 'cascade' }),
  
  // Foreign key to origin station
  originStationId: varchar('origin_station_id', { length: 10 })
    .notNull()
    .references(() => stations.staId, { onDelete: 'cascade' }),
  
  // Foreign key to destination station
  destinationStationId: varchar('destination_station_id', { length: 10 })
    .notNull()
    .references(() => stations.staId, { onDelete: 'cascade' }),
  
  // Train and route information
  trainId: varchar('train_id', { length: 50 }).notNull(),
  lineName: varchar('line_name', { length: 100 }).notNull(),
  routeName: varchar('route_name', { length: 100 }).notNull(),
  
  // Timing information (stored as timestamps for easy filtering)
  departsAt: timestamp('departs_at', { withTimezone: true }).notNull(),
  arrivesAt: timestamp('arrives_at', { withTimezone: true }).notNull(),
  
  // Metadata (JSON field for flexible data like color)
  metadata: text('metadata'), // JSON string
  
  // Audit fields
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // Indexes for query performance
  stationIdx: index('schedules_station_idx').on(table.stationId),
  trainIdx: index('schedules_train_idx').on(table.trainId),
  departsAtIdx: index('schedules_departs_at_idx').on(table.departsAt),
}))

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
