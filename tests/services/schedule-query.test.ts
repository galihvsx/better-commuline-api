import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { db } from '../../src/db'
import { schedules, stations } from '../../src/db/schema'
import { createScheduleQueryService } from '../../src/services/schedule-query'
import { eq } from 'drizzle-orm'

describe('Schedule Query Service', () => {
  const service = createScheduleQueryService()

  const testStationId = 'TST001'
  const testOriginStationId = 'TST002'
  const testDestinationStationId = 'TST003'

  beforeEach(async () => {
    await db.insert(stations).values([
      {
        staId: testStationId,
        staName: 'Test Station',
        groupWil: 1,
        fgEnable: 1,
      },
      {
        staId: testOriginStationId,
        staName: 'Origin Station',
        groupWil: 1,
        fgEnable: 1,
      },
      {
        staId: testDestinationStationId,
        staName: 'Destination Station',
        groupWil: 1,
        fgEnable: 1,
      },
    ])

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const schedule1DepartsAt = new Date(today)
    schedule1DepartsAt.setHours(8, 0, 0, 0)
    const schedule1ArrivesAt = new Date(today)
    schedule1ArrivesAt.setHours(9, 30, 0, 0)

    const schedule2DepartsAt = new Date(today)
    schedule2DepartsAt.setHours(10, 15, 0, 0)
    const schedule2ArrivesAt = new Date(today)
    schedule2ArrivesAt.setHours(11, 45, 0, 0)

    const schedule3DepartsAt = new Date(today)
    schedule3DepartsAt.setHours(14, 30, 0, 0)
    const schedule3ArrivesAt = new Date(today)
    schedule3ArrivesAt.setHours(16, 0, 0, 0)

    await db.insert(schedules).values([
      {
        id: 'sc_krl_tst001_train1',
        stationId: testStationId,
        originStationId: testOriginStationId,
        destinationStationId: testDestinationStationId,
        trainId: 'TRAIN1',
        lineName: 'Commuter Line',
        routeName: 'ORIGIN STATION-DESTINATION STATION',
        departsAt: schedule1DepartsAt,
        arrivesAt: schedule1ArrivesAt,
        metadata: JSON.stringify({ origin: { color: '#FF0000' } }),
      },
      {
        id: 'sc_krl_tst001_train2',
        stationId: testStationId,
        originStationId: testOriginStationId,
        destinationStationId: testDestinationStationId,
        trainId: 'TRAIN2',
        lineName: 'Commuter Line Express',
        routeName: 'ORIGIN STATION-DESTINATION STATION',
        departsAt: schedule2DepartsAt,
        arrivesAt: schedule2ArrivesAt,
        metadata: JSON.stringify({ origin: { color: '#00FF00' } }),
      },
      {
        id: 'sc_krl_tst001_train3',
        stationId: testStationId,
        originStationId: testOriginStationId,
        destinationStationId: testDestinationStationId,
        trainId: 'TRAIN3',
        lineName: 'Commuter Line Local',
        routeName: 'ORIGIN STATION-DESTINATION STATION',
        departsAt: schedule3DepartsAt,
        arrivesAt: schedule3ArrivesAt,
        metadata: null,
      },
    ])
  })

  afterEach(async () => {
    await db.delete(schedules).where(eq(schedules.stationId, testStationId))
    await db.delete(stations).where(eq(stations.staId, testStationId))
    await db.delete(stations).where(eq(stations.staId, testOriginStationId))
    await db.delete(stations).where(eq(stations.staId, testDestinationStationId))
  })

  test('should query schedules with time range filter', async () => {
    const response = await service.querySchedules(testStationId, '08:00', '11:00')

    expect(response.status).toBe(200)
    expect(response.data).toHaveLength(2)
    expect(response.data[0].train_id).toBe('TRAIN1')
    expect(response.data[0].time_est).toBe('08:00')
    expect(response.data[1].train_id).toBe('TRAIN2')
    expect(response.data[1].time_est).toBe('10:15')
  })

  test('should return schedules ordered by departure time', async () => {
    const response = await service.querySchedules(testStationId, '00:00', '23:59')

    expect(response.status).toBe(200)
    expect(response.data).toHaveLength(3)
    expect(response.data[0].train_id).toBe('TRAIN1')
    expect(response.data[1].train_id).toBe('TRAIN2')
    expect(response.data[2].train_id).toBe('TRAIN3')
  })

  test('should join with stations table for destination name', async () => {
    const response = await service.querySchedules(testStationId, '08:00', '09:00')

    expect(response.status).toBe(200)
    expect(response.data).toHaveLength(1)
    expect(response.data[0].dest).toBe('Destination Station')
  })

  test('should extract color from metadata JSON', async () => {
    const response = await service.querySchedules(testStationId, '08:00', '09:00')

    expect(response.status).toBe(200)
    expect(response.data).toHaveLength(1)
    expect(response.data[0].color).toBe('#FF0000')
  })

  test('should handle null metadata gracefully', async () => {
    const response = await service.querySchedules(testStationId, '14:00', '15:00')

    expect(response.status).toBe(200)
    expect(response.data).toHaveLength(1)
    expect(response.data[0].train_id).toBe('TRAIN3')
    expect(response.data[0].color).toBeNull()
  })

  test('should format timestamps to HH:mm format', async () => {
    const response = await service.querySchedules(testStationId, '10:00', '11:00')

    expect(response.status).toBe(200)
    expect(response.data).toHaveLength(1)
    expect(response.data[0].time_est).toBe('10:15')
    expect(response.data[0].dest_time).toBe('11:45')
  })

  test('should return empty array when no schedules match time range', async () => {
    const response = await service.querySchedules(testStationId, '20:00', '21:00')

    expect(response.status).toBe(200)
    expect(response.data).toHaveLength(0)
  })

  test('should throw 404 error for non-existent station', async () => {
    try {
      await service.querySchedules('NONEXISTENT', '08:00', '09:00')
      expect(true).toBe(false)
    } catch (error: any) {
      expect(error.status).toBe(404)
      expect(error.message).toContain('not found')
    }
  })
})
