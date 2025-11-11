import { describe, it, expect } from 'bun:test'
import { parseTimeToTimestamp } from '../../src/utils/time-parsing'

describe('parseTimeToTimestamp', () => {
  it('should parse valid HH:mm format', () => {
    const result = parseTimeToTimestamp('08:30', new Date('2024-01-15T00:00:00Z'))
    
    expect(result.getUTCHours()).toBe(1)
    expect(result.getUTCMinutes()).toBe(30)
  })

  it('should handle midnight (00:00)', () => {
    const result = parseTimeToTimestamp('00:00', new Date('2024-01-15T00:00:00Z'))
    
    expect(result.getUTCHours()).toBe(17)
    expect(result.getUTCMinutes()).toBe(0)
  })

  it('should handle end of day (23:59)', () => {
    const result = parseTimeToTimestamp('23:59', new Date('2024-01-15T00:00:00Z'))
    
    expect(result.getUTCHours()).toBe(16)
    expect(result.getUTCMinutes()).toBe(59)
  })

  it('should handle single digit hours', () => {
    const result = parseTimeToTimestamp('9:15', new Date('2024-01-15T00:00:00Z'))
    
    expect(result.getUTCHours()).toBe(2)
    expect(result.getUTCMinutes()).toBe(15)
  })

  it('should throw error for invalid format', () => {
    expect(() => parseTimeToTimestamp('25:00')).toThrow('Invalid time format')
    expect(() => parseTimeToTimestamp('12:60')).toThrow('Invalid time format')
    expect(() => parseTimeToTimestamp('12-30')).toThrow('Invalid time format')
    expect(() => parseTimeToTimestamp('invalid')).toThrow('Invalid time format')
  })

  it('should use current date when no reference date provided', () => {
    const result = parseTimeToTimestamp('12:00')
    
    expect(result).toBeInstanceOf(Date)
    expect(result.getUTCHours()).toBe(5)
    expect(result.getUTCMinutes()).toBe(0)
  })

  it('should handle timezone conversion correctly for WIB (UTC+7)', () => {
    const result = parseTimeToTimestamp('14:30', new Date('2024-01-15T00:00:00Z'))
    
    expect(result.getUTCHours()).toBe(7)
    expect(result.getUTCMinutes()).toBe(30)
  })
})
