import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { db } from '../../src/db'
import { schedules, stations } from '../../src/db/schema'
import { eq } from 'drizzle-orm'
import app from '../../src/app'

describe('Schedules API Endpoint Integration Tests', () => {
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

    const schedule4DepartsAt = new Date(today)
    schedule4DepartsAt.setHours(18, 45, 0, 0)
    const schedule4ArrivesAt = new Date(today)
    schedule4ArrivesAt.setHours(20, 15, 0, 0)

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
      {
        id: 'sc_krl_tst001_train4',
        stationId: testStationId,
        originStationId: testOriginStationId,
        destinationStationId: testDestinationStationId,
        trainId: 'TRAIN4',
        lineName: 'Commuter Line Evening',
        routeName: 'ORIGIN STATION-DESTINATION STATION',
        departsAt: schedule4DepartsAt,
        arrivesAt: schedule4ArrivesAt,
        metadata: JSON.stringify({ origin: { color: '#0000FF' } }),
      },
    ])
  })

  afterEach(async () => {
    await db.delete(schedules).where(eq(schedules.stationId, testStationId))
    await db.delete(stations).where(eq(stations.staId, testStationId))
    await db.delete(stations).where(eq(stations.staId, testOriginStationId))
    await db.delete(stations).where(eq(stations.staId, testDestinationStationId))
  })

  test('should filter schedules by time range (morning)', async () => {
    const response = await app.request(
      `/schedules?stationid=${testStationId}&timefrom=08:00&timeto=11:00`
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    
    expect(body.status).toBe(200)
    expect(body.data).toHaveLength(2)
    expect(body.data[0].train_id).toBe('TRAIN1')
    expect(body.data[0].time_est).toBe('08:00')
    expect(body.data[1].train_id).toBe('TRAIN2')
    expect(body.data[1].time_est).toBe('10:15')
  })

  test('should filter schedules by time range (afternoon)', async () => {
    const response = await app.request(
      `/schedules?stationid=${testStationId}&timefrom=14:00&timeto=19:00`
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    
    expect(body.status).toBe(200)
    expect(body.data).toHaveLength(2)
    expect(body.data[0].train_id).toBe('TRAIN3')
    expect(body.data[0].time_est).toBe('14:30')
    expect(body.data[1].train_id).toBe('TRAIN4')
    expect(body.data[1].time_est).toBe('18:45')
  })

  test('should filter schedules by narrow time range', async () => {
    const response = await app.request(
      `/schedules?stationid=${testStationId}&timefrom=10:00&timeto=10:30`
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    
    expect(body.status).toBe(200)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].train_id).toBe('TRAIN2')
  })

  test('should return all schedules for full day range', async () => {
    const response = await app.request(
      `/schedules?stationid=${testStationId}&timefrom=00:00&timeto=23:59`
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    
    expect(body.status).toBe(200)
    expect(body.data).toHaveLength(4)
  })

  test('should return response in correct format', async () => {
    const response = await app.request(
      `/schedules?stationid=${testStationId}&timefrom=08:00&timeto=09:00`
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    
    expect(body).toHaveProperty('status')
    expect(body).toHaveProperty('data')
    expect(body.status).toBe(200)
    expect(Array.isArray(body.data)).toBe(true)
    
    const schedule = body.data[0]
    expect(schedule).toHaveProperty('train_id')
    expect(schedule).toHaveProperty('ka_name')
    expect(schedule).toHaveProperty('route_name')
    expect(schedule).toHaveProperty('dest')
    expect(schedule).toHaveProperty('time_est')
    expect(schedule).toHaveProperty('dest_time')
    expect(schedule).toHaveProperty('color')
  })

  test('should include destination station name in response', async () => {
    const response = await app.request(
      `/schedules?stationid=${testStationId}&timefrom=08:00&timeto=09:00`
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    
    expect(body.data[0].dest).toBe('Destination Station')
  })

  test('should include color from metadata', async () => {
    const response = await app.request(
      `/schedules?stationid=${testStationId}&timefrom=08:00&timeto=09:00`
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    
    expect(body.data[0].color).toBe('#FF0000')
  })

  test('should handle null metadata with empty string color', async () => {
    const response = await app.request(
      `/schedules?stationid=${testStationId}&timefrom=14:00&timeto=15:00`
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    
    expect(body.data[0].train_id).toBe('TRAIN3')
    expect(body.data[0].color).toBe('')
  })

  test('should format timestamps correctly', async () => {
    const response = await app.request(
      `/schedules?stationid=${testStationId}&timefrom=10:00&timeto=11:00`
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    
    expect(body.data[0].time_est).toBe('10:15')
    expect(body.data[0].dest_time).toBe('11:45')
    expect(body.data[0].time_est).toMatch(/^\d{2}:\d{2}$/)
    expect(body.data[0].dest_time).toMatch(/^\d{2}:\d{2}$/)
  })

  test('should return empty array when no schedules match time range', async () => {
    const response = await app.request(
      `/schedules?stationid=${testStationId}&timefrom=20:00&timeto=21:00`
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    
    expect(body.status).toBe(200)
    expect(body.data).toHaveLength(0)
    expect(Array.isArray(body.data)).toBe(true)
  })

  test('should return empty array for early morning with no schedules', async () => {
    const response = await app.request(
      `/schedules?stationid=${testStationId}&timefrom=00:00&timeto=05:00`
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    
    expect(body.status).toBe(200)
    expect(body.data).toHaveLength(0)
  })

  test('should return 404 for non-existent station', async () => {
    const response = await app.request(
      '/schedules?stationid=NONEXISTENT&timefrom=08:00&timeto=09:00'
    )

    expect(response.status).toBe(404)
  })

  test('should return 400 for missing stationid parameter', async () => {
    const response = await app.request(
      '/schedules?timefrom=08:00&timeto=09:00'
    )

    expect(response.status).toBe(400)
  })

  test('should return 400 for missing timefrom parameter', async () => {
    const response = await app.request(
      `/schedules?stationid=${testStationId}&timeto=09:00`
    )

    expect(response.status).toBe(400)
  })

  test('should return 400 for missing timeto parameter', async () => {
    const response = await app.request(
      `/schedules?stationid=${testStationId}&timefrom=08:00`
    )

    expect(response.status).toBe(400)
  })

  test('should return 400 for invalid time format', async () => {
    const response = await app.request(
      `/schedules?stationid=${testStationId}&timefrom=25:00&timeto=09:00`
    )

    expect(response.status).toBe(400)
  })

  test('should return schedules ordered by departure time', async () => {
    const response = await app.request(
      `/schedules?stationid=${testStationId}&timefrom=00:00&timeto=23:59`
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    
    expect(body.data).toHaveLength(4)
    expect(body.data[0].train_id).toBe('TRAIN1')
    expect(body.data[1].train_id).toBe('TRAIN2')
    expect(body.data[2].train_id).toBe('TRAIN3')
    expect(body.data[3].train_id).toBe('TRAIN4')
    
    const times = body.data.map((s: any) => s.time_est)
    expect(times[0]).toBe('08:00')
    expect(times[1]).toBe('10:15')
    expect(times[2]).toBe('14:30')
    expect(times[3]).toBe('18:45')
  })
})
