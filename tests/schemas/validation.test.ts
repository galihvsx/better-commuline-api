import { describe, test, expect } from 'bun:test'
import { scheduleQuerySchema, fareQuerySchema } from '../../src/schemas/validation'

describe('Validation Schemas', () => {
  describe('scheduleQuerySchema', () => {
    describe('Valid inputs', () => {
      test('should validate correct schedule query parameters', () => {
        const validData = {
          stationid: 'BKS',
          timefrom: '05:00',
          timeto: '09:00',
        }

        const result = scheduleQuerySchema.safeParse(validData)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toEqual(validData)
        }
      })

      test('should accept midnight time (00:00)', () => {
        const validData = {
          stationid: 'JAKK',
          timefrom: '00:00',
          timeto: '06:00',
        }

        const result = scheduleQuerySchema.safeParse(validData)

        expect(result.success).toBe(true)
      })

      test('should accept end of day time (23:59)', () => {
        const validData = {
          stationid: 'BKS',
          timefrom: '20:00',
          timeto: '23:59',
        }

        const result = scheduleQuerySchema.safeParse(validData)

        expect(result.success).toBe(true)
      })

      test('should accept single digit station IDs', () => {
        const validData = {
          stationid: 'A',
          timefrom: '10:00',
          timeto: '12:00',
        }

        const result = scheduleQuerySchema.safeParse(validData)

        expect(result.success).toBe(true)
      })

      test('should accept long station IDs', () => {
        const validData = {
          stationid: 'VERYLONGSTATIONID',
          timefrom: '10:00',
          timeto: '12:00',
        }

        const result = scheduleQuerySchema.safeParse(validData)

        expect(result.success).toBe(true)
      })
    })

    describe('Invalid inputs - stationid', () => {
      test('should reject missing stationid', () => {
        const invalidData = {
          timefrom: '05:00',
          timeto: '09:00',
        }

        const result = scheduleQuerySchema.safeParse(invalidData)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('required')
        }
      })

      test('should reject empty stationid', () => {
        const invalidData = {
          stationid: '',
          timefrom: '05:00',
          timeto: '09:00',
        }

        const result = scheduleQuerySchema.safeParse(invalidData)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('empty')
        }
      })

      test('should reject non-string stationid', () => {
        const invalidData = {
          stationid: 123,
          timefrom: '05:00',
          timeto: '09:00',
        }

        const result = scheduleQuerySchema.safeParse(invalidData)

        expect(result.success).toBe(false)
      })
    })

    describe('Invalid inputs - timefrom', () => {
      test('should reject missing timefrom', () => {
        const invalidData = {
          stationid: 'BKS',
          timeto: '09:00',
        }

        const result = scheduleQuerySchema.safeParse(invalidData)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('required')
        }
      })

      test('should reject invalid time format (single digit hour)', () => {
        const invalidData = {
          stationid: 'BKS',
          timefrom: '5:00',
          timeto: '09:00',
        }

        const result = scheduleQuerySchema.safeParse(invalidData)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('HH:mm')
        }
      })

      test('should reject invalid time format (single digit minute)', () => {
        const invalidData = {
          stationid: 'BKS',
          timefrom: '05:0',
          timeto: '09:00',
        }

        const result = scheduleQuerySchema.safeParse(invalidData)

        expect(result.success).toBe(false)
      })

      test('should reject invalid hour (24)', () => {
        const invalidData = {
          stationid: 'BKS',
          timefrom: '24:00',
          timeto: '09:00',
        }

        const result = scheduleQuerySchema.safeParse(invalidData)

        expect(result.success).toBe(false)
      })

      test('should reject invalid minute (60)', () => {
        const invalidData = {
          stationid: 'BKS',
          timefrom: '05:60',
          timeto: '09:00',
        }

        const result = scheduleQuerySchema.safeParse(invalidData)

        expect(result.success).toBe(false)
      })

      test('should reject time with seconds', () => {
        const invalidData = {
          stationid: 'BKS',
          timefrom: '05:00:00',
          timeto: '09:00',
        }

        const result = scheduleQuerySchema.safeParse(invalidData)

        expect(result.success).toBe(false)
      })

      test('should reject time without colon', () => {
        const invalidData = {
          stationid: 'BKS',
          timefrom: '0500',
          timeto: '09:00',
        }

        const result = scheduleQuerySchema.safeParse(invalidData)

        expect(result.success).toBe(false)
      })
    })

    describe('Invalid inputs - timeto', () => {
      test('should reject missing timeto', () => {
        const invalidData = {
          stationid: 'BKS',
          timefrom: '05:00',
        }

        const result = scheduleQuerySchema.safeParse(invalidData)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('required')
        }
      })

      test('should reject invalid timeto format', () => {
        const invalidData = {
          stationid: 'BKS',
          timefrom: '05:00',
          timeto: '9:00',
        }

        const result = scheduleQuerySchema.safeParse(invalidData)

        expect(result.success).toBe(false)
      })
    })
  })

  describe('fareQuerySchema', () => {
    describe('Valid inputs', () => {
      test('should validate correct fare query parameters', () => {
        const validData = {
          stationfrom: 'BKS',
          stationto: 'JAKK',
        }

        const result = fareQuerySchema.safeParse(validData)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toEqual(validData)
        }
      })

      test('should accept same station for from and to', () => {
        const validData = {
          stationfrom: 'BKS',
          stationto: 'BKS',
        }

        const result = fareQuerySchema.safeParse(validData)

        expect(result.success).toBe(true)
      })

      test('should accept single character station codes', () => {
        const validData = {
          stationfrom: 'A',
          stationto: 'B',
        }

        const result = fareQuerySchema.safeParse(validData)

        expect(result.success).toBe(true)
      })

      test('should accept long station codes', () => {
        const validData = {
          stationfrom: 'VERYLONGSTATIONCODE',
          stationto: 'ANOTHERLONGCODE',
        }

        const result = fareQuerySchema.safeParse(validData)

        expect(result.success).toBe(true)
      })
    })

    describe('Invalid inputs - stationfrom', () => {
      test('should reject missing stationfrom', () => {
        const invalidData = {
          stationto: 'JAKK',
        }

        const result = fareQuerySchema.safeParse(invalidData)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('required')
        }
      })

      test('should reject empty stationfrom', () => {
        const invalidData = {
          stationfrom: '',
          stationto: 'JAKK',
        }

        const result = fareQuerySchema.safeParse(invalidData)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('empty')
        }
      })

      test('should reject non-string stationfrom', () => {
        const invalidData = {
          stationfrom: 123,
          stationto: 'JAKK',
        }

        const result = fareQuerySchema.safeParse(invalidData)

        expect(result.success).toBe(false)
      })
    })

    describe('Invalid inputs - stationto', () => {
      test('should reject missing stationto', () => {
        const invalidData = {
          stationfrom: 'BKS',
        }

        const result = fareQuerySchema.safeParse(invalidData)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('required')
        }
      })

      test('should reject empty stationto', () => {
        const invalidData = {
          stationfrom: 'BKS',
          stationto: '',
        }

        const result = fareQuerySchema.safeParse(invalidData)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('empty')
        }
      })

      test('should reject non-string stationto', () => {
        const invalidData = {
          stationfrom: 'BKS',
          stationto: 456,
        }

        const result = fareQuerySchema.safeParse(invalidData)

        expect(result.success).toBe(false)
      })
    })

    describe('Multiple validation errors', () => {
      test('should report all validation errors', () => {
        const invalidData = {
          stationfrom: '',
          stationto: '',
        }

        const result = fareQuerySchema.safeParse(invalidData)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThanOrEqual(2)
        }
      })
    })
  })

  describe('Type inference', () => {
    test('should infer correct types from scheduleQuerySchema', () => {
      const validData = {
        stationid: 'BKS',
        timefrom: '05:00',
        timeto: '09:00',
      }

      const result = scheduleQuerySchema.parse(validData)

      const stationid: string = result.stationid
      const timefrom: string = result.timefrom
      const timeto: string = result.timeto

      expect(typeof stationid).toBe('string')
      expect(typeof timefrom).toBe('string')
      expect(typeof timeto).toBe('string')
    })

    test('should infer correct types from fareQuerySchema', () => {
      const validData = {
        stationfrom: 'BKS',
        stationto: 'JAKK',
      }

      const result = fareQuerySchema.parse(validData)

      const stationfrom: string = result.stationfrom
      const stationto: string = result.stationto

      expect(typeof stationfrom).toBe('string')
      expect(typeof stationto).toBe('string')
    })
  })
})
