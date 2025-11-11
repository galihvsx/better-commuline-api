import { pgTable, varchar, integer, timestamp, serial, text, index } from 'drizzle-orm/pg-core'

export const stations = pgTable('stations', {
  staId: varchar('sta_id', { length: 10 }).primaryKey(),
  staName: varchar('sta_name', { length: 255 }).notNull(),
  groupWil: integer('group_wil').notNull(),
  fgEnable: integer('fg_enable').notNull(),
  metadata: text('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const schedules = pgTable('schedules', {
  id: varchar('id', { length: 100 }).primaryKey(),
  
  stationId: varchar('station_id', { length: 10 })
    .notNull()
    .references(() => stations.staId, { onDelete: 'cascade' }),
  
  originStationId: varchar('origin_station_id', { length: 10 })
    .notNull()
    .references(() => stations.staId, { onDelete: 'cascade' }),
  
  destinationStationId: varchar('destination_station_id', { length: 10 })
    .notNull()
    .references(() => stations.staId, { onDelete: 'cascade' }),
  
  trainId: varchar('train_id', { length: 50 }).notNull(),
  lineName: varchar('line_name', { length: 100 }).notNull(),
  routeName: varchar('route_name', { length: 100 }).notNull(),
  
  departsAt: timestamp('departs_at', { withTimezone: true }).notNull(),
  arrivesAt: timestamp('arrives_at', { withTimezone: true }).notNull(),
  
  metadata: text('metadata'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  stationIdx: index('schedules_station_idx').on(table.stationId),
  trainIdx: index('schedules_train_idx').on(table.trainId),
  departsAtIdx: index('schedules_departs_at_idx').on(table.departsAt),
}))

export const routeMaps = pgTable('route_maps', {
  id: serial('id').primaryKey(),
  area: integer('area').notNull(),
  permalink: varchar('permalink', { length: 500 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const syncMetadata = pgTable('sync_metadata', {
  id: serial('id').primaryKey(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
