import { describe, it, expect } from 'vitest'
import { bucketDay } from '../lib/stats/bucketDay'

describe('bucketDay', () => {
  it('returns YYYY-MM-DD for a session at noon UTC with zero offset and zero day start', () => {
    const ts = new Date('2025-06-15T12:00:00.000Z').getTime()
    expect(bucketDay(ts, 0, 0)).toBe('2025-06-15')
  })

  it('a session before the day start hour belongs to the previous calendar day', () => {
    // 3am UTC on June 15, day starts at 6am → belongs to June 14
    const ts = new Date('2025-06-15T03:00:00.000Z').getTime()
    expect(bucketDay(ts, 0, 6)).toBe('2025-06-14')
  })

  it('a session at exactly the day start hour belongs to the current day', () => {
    // 6am UTC on June 15, day starts at 6am → belongs to June 15
    const ts = new Date('2025-06-15T06:00:00.000Z').getTime()
    expect(bucketDay(ts, 0, 6)).toBe('2025-06-15')
  })

  it('applies a positive timezone offset before bucketing', () => {
    // 23:00 UTC on June 14 = 01:00 on June 15 in UTC+2 (tzOffset +120)
    const ts = new Date('2025-06-14T23:00:00.000Z').getTime()
    expect(bucketDay(ts, 120, 0)).toBe('2025-06-15')
  })

  it('applies a negative timezone offset before bucketing', () => {
    // 02:00 UTC on June 15 = 21:00 on June 14 in UTC-5 (tzOffset -300)
    const ts = new Date('2025-06-15T02:00:00.000Z').getTime()
    expect(bucketDay(ts, -300, 0)).toBe('2025-06-14')
  })

  it('handles a fractional day start hour (e.g. 6.5 = 06:30)', () => {
    // 06:20 UTC on June 15, day starts at 06:30 → belongs to June 14
    const ts = new Date('2025-06-15T06:20:00.000Z').getTime()
    expect(bucketDay(ts, 0, 6.5)).toBe('2025-06-14')
  })
})
