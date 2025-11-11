/**
 * Unit tests for Station Name Normalization Utilities
 * Tests station name mapping and route parsing functions
 */

import { describe, test, expect } from 'bun:test'
import { normalizeStationName, parseRouteName } from '../../src/utils/station-normalization'

describe('Station Normalization Utilities', () => {
  describe('normalizeStationName', () => {
    describe('Mapped station names', () => {
      test('should normalize TANJUNGPRIUK to TANJUNG PRIOK', () => {
        const result = normalizeStationName('TANJUNGPRIUK')
        expect(result).toBe('TANJUNG PRIOK')
      })

      test('should normalize JAKARTAKOTA to JAKARTA KOTA', () => {
        const result = normalizeStationName('JAKARTAKOTA')
        expect(result).toBe('JAKARTA KOTA')
      })

      test('should normalize KAMPUNGBANDAN to KAMPUNG BANDAN', () => {
        const result = normalizeStationName('KAMPUNGBANDAN')
        expect(result).toBe('KAMPUNG BANDAN')
      })

      test('should normalize TANAHABANG to TANAH ABANG', () => {
        const result = normalizeStationName('TANAHABANG')
        expect(result).toBe('TANAH ABANG')
      })

      test('should normalize PARUNGPANJANG to PARUNG PANJANG', () => {
        const result = normalizeStationName('PARUNGPANJANG')
        expect(result).toBe('PARUNG PANJANG')
      })

      test('should normalize BANDARASOEKARNOHATTA to BANDARA SOEKARNO HATTA', () => {
        const result = normalizeStationName('BANDARASOEKARNOHATTA')
        expect(result).toBe('BANDARA SOEKARNO HATTA')
      })
    })

    describe('Unmapped station names', () => {
      test('should return original name for unmapped station', () => {
        const result = normalizeStationName('BOGOR')
        expect(result).toBe('BOGOR')
      })

      test('should return original name for another unmapped station', () => {
        const result = normalizeStationName('BEKASI')
        expect(result).toBe('BEKASI')
      })

      test('should return original name for lowercase unmapped station', () => {
        const result = normalizeStationName('depok')
        expect(result).toBe('depok')
      })

      test('should return original name for mixed case unmapped station', () => {
        const result = normalizeStationName('Manggarai')
        expect(result).toBe('Manggarai')
      })

      test('should return empty string unchanged', () => {
        const result = normalizeStationName('')
        expect(result).toBe('')
      })
    })
  })

  describe('parseRouteName', () => {
    describe('Route parsing with normalization', () => {
      test('should parse and normalize route with mapped station names', () => {
        const result = parseRouteName('BOGOR-JAKARTAKOTA')
        expect(result).toEqual({
          origin: 'BOGOR',
          destination: 'JAKARTA KOTA',
        })
      })

      test('should parse and normalize route with TANJUNGPRIUK', () => {
        const result = parseRouteName('TANJUNGPRIUK-BOGOR')
        expect(result).toEqual({
          origin: 'TANJUNG PRIOK',
          destination: 'BOGOR',
        })
      })

      test('should parse and normalize route with KAMPUNGBANDAN', () => {
        const result = parseRouteName('KAMPUNGBANDAN-TANAHABANG')
        expect(result).toEqual({
          origin: 'KAMPUNG BANDAN',
          destination: 'TANAH ABANG',
        })
      })

      test('should parse and normalize route with PARUNGPANJANG', () => {
        const result = parseRouteName('PARUNGPANJANG-TANAHABANG')
        expect(result).toEqual({
          origin: 'PARUNG PANJANG',
          destination: 'TANAH ABANG',
        })
      })

      test('should parse and normalize route with BANDARASOEKARNOHATTA', () => {
        const result = parseRouteName('BANDARASOEKARNOHATTA-BEKASI')
        expect(result).toEqual({
          origin: 'BANDARA SOEKARNO HATTA',
          destination: 'BEKASI',
        })
      })

      test('should parse route with both stations needing normalization', () => {
        const result = parseRouteName('JAKARTAKOTA-TANJUNGPRIUK')
        expect(result).toEqual({
          origin: 'JAKARTA KOTA',
          destination: 'TANJUNG PRIOK',
        })
      })
    })

    describe('Route parsing without normalization', () => {
      test('should parse route with unmapped station names', () => {
        const result = parseRouteName('BOGOR-BEKASI')
        expect(result).toEqual({
          origin: 'BOGOR',
          destination: 'BEKASI',
        })
      })

      test('should parse route with spaces in station names', () => {
        const result = parseRouteName('DEPOK BARU-MANGGARAI')
        expect(result).toEqual({
          origin: 'DEPOK BARU',
          destination: 'MANGGARAI',
        })
      })
    })

    describe('Route parsing with whitespace', () => {
      test('should handle route with extra spaces around hyphen', () => {
        const result = parseRouteName('BOGOR - JAKARTAKOTA')
        expect(result).toEqual({
          origin: 'BOGOR',
          destination: 'JAKARTA KOTA',
        })
      })

      test('should handle route with leading/trailing spaces', () => {
        const result = parseRouteName(' BOGOR-BEKASI ')
        expect(result).toEqual({
          origin: 'BOGOR',
          destination: 'BEKASI',
        })
      })
    })
  })
})
