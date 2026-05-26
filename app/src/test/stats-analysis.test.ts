import { describe, it, expect } from 'vitest'
import { deriveAnalysisStats } from '../lib/stats/analysis'
import { makeSettings, makeRecord } from './helpers'

// June 15 2025 is a Sunday
const NOW = new Date('2025-06-15T12:00:00.000Z').getTime()
const SETTINGS = makeSettings({ dayStartHour: 0, countSessionAfterPercent: 50 })

describe('deriveAnalysisStats', () => {
  it('returns all-zero values and an empty-but-sized calendar when there are no sessions', () => {
    const stats = deriveAnalysisStats([], SETTINGS, NOW)
    expect(stats.allTimeMinutes).toBe(0)
    expect(stats.allTimeSessions).toBe(0)
    expect(stats.allTimeActiveDays).toBe(0)
    expect(stats.completionRate).toBe(0)
    expect(stats.breakComplianceRate).toBe(0)
    expect(stats.calendarHeatmap).toHaveLength(365)
    expect(stats.calendarHeatmap.every(e => e.minutes === 0)).toBe(true)
    expect(stats.focusByHour).toHaveLength(24)
    expect(stats.focusByDayOfWeek).toHaveLength(7)
  })

  it('calendarHeatmap entry for today reflects the correct focus minutes', () => {
    const session = makeRecord({ netActiveMs: 30 * 60_000 })
    const stats = deriveAnalysisStats([session], SETTINGS, NOW)
    const today = stats.calendarHeatmap.find(e => e.date === '2025-06-15')!
    expect(today.minutes).toBe(30)
  })

  it('focusByHour places minutes at the correct hour index (UTC, tzOffset=0)', () => {
    // Session starts at 9:00 UTC
    const session = makeRecord({
      startedAt: new Date('2025-06-15T09:00:00.000Z').getTime(),
      netActiveMs: 20 * 60_000,
    })
    const stats = deriveAnalysisStats([session], SETTINGS, NOW)
    expect(stats.focusByHour[9]).toBeGreaterThan(0)
    stats.focusByHour.forEach((v, i) => { if (i !== 9) expect(v).toBe(0) })
  })

  it('focusByDayOfWeek uses Mon=0 scheme: Sunday (June 15) maps to index 6', () => {
    const sunday = makeRecord({
      startedAt: new Date('2025-06-15T09:00:00.000Z').getTime(),
      netActiveMs: 25 * 60_000,
    })
    const stats = deriveAnalysisStats([sunday], SETTINGS, NOW)
    expect(stats.focusByDayOfWeek[6]).toBeGreaterThan(0) // Sunday = 6
    expect(stats.focusByDayOfWeek[0]).toBe(0)            // Monday = 0
  })

  it('sessionLengthBuckets: 5-min session → <10, 25-min session → 20–30', () => {
    const short  = makeRecord({ id: 'short',  netActiveMs: 5  * 60_000, plannedDuration: 10 * 60_000 })
    const medium = makeRecord({ id: 'medium', netActiveMs: 25 * 60_000 })
    const stats = deriveAnalysisStats([short, medium], SETTINGS, NOW)
    const lt10 = stats.sessionLengthBuckets.find(b => b.rangeLabel === '<10')!
    const b2030 = stats.sessionLengthBuckets.find(b => b.rangeLabel === '20–30')!
    expect(lt10.count).toBe(1)
    expect(b2030.count).toBe(1)
  })

  it('completionRate = completed sessions / all focus sessions', () => {
    const completed   = makeRecord({ id: 'c', netActiveMs: 25 * 60_000, plannedDuration: 25 * 60_000 }) // 100% ≥ 50%
    const incomplete  = makeRecord({ id: 'i', netActiveMs:  5 * 60_000, plannedDuration: 25 * 60_000 }) // 20% < 50%
    const stats = deriveAnalysisStats([completed, incomplete], SETTINGS, NOW)
    expect(stats.completionRate).toBe(0.5)
  })

  it('abandoned sessions count as started but not completed for completionRate', () => {
    const abandoned = makeRecord({
      endReason: 'abandoned',
      netActiveMs: 5 * 60_000,
      plannedDuration: 25 * 60_000,
    })
    const stats = deriveAnalysisStats([abandoned], SETTINGS, NOW)
    expect(stats.completionRate).toBe(0)
  })

  it('breakComplianceRate = break records / completed focus records', () => {
    // 3 completed focus + 2 breaks (1 break was skipped → no record)
    const focuses = [
      makeRecord({ id: 'f1', netActiveMs: 25 * 60_000, plannedDuration: 25 * 60_000 }),
      makeRecord({ id: 'f2', netActiveMs: 25 * 60_000, plannedDuration: 25 * 60_000 }),
      makeRecord({ id: 'f3', netActiveMs: 25 * 60_000, plannedDuration: 25 * 60_000 }),
    ]
    const breaks = [
      makeRecord({ id: 'b1', sessionType: 'short_break', netActiveMs: 5 * 60_000, plannedDuration: 5 * 60_000 }),
      makeRecord({ id: 'b2', sessionType: 'short_break', netActiveMs: 5 * 60_000, plannedDuration: 5 * 60_000 }),
    ]
    const stats = deriveAnalysisStats([...focuses, ...breaks], SETTINGS, NOW)
    expect(stats.breakComplianceRate).toBeCloseTo(2 / 3)
  })

  it('allTimeActiveDays counts distinct days with at least one completed focus session', () => {
    const day1a = makeRecord({ id: 'a', startedAt: new Date('2025-06-13T09:00:00.000Z').getTime() })
    const day1b = makeRecord({ id: 'b', startedAt: new Date('2025-06-13T11:00:00.000Z').getTime() })
    const day2  = makeRecord({ id: 'c', startedAt: new Date('2025-06-14T09:00:00.000Z').getTime() })
    const stats = deriveAnalysisStats([day1a, day1b, day2], SETTINGS, NOW)
    expect(stats.allTimeActiveDays).toBe(2)
  })

  it('longestSessionMinutes reflects the session with the most netActiveMs', () => {
    const short = makeRecord({ id: 's', netActiveMs: 10 * 60_000, plannedDuration: 10 * 60_000 })
    const long  = makeRecord({ id: 'l', netActiveMs: 50 * 60_000, plannedDuration: 50 * 60_000 })
    const stats = deriveAnalysisStats([short, long], SETTINGS, NOW)
    expect(stats.longestSessionMinutes).toBe(50)
  })

  it('densityMatrix has shape [7][24] with non-negative values', () => {
    const session = makeRecord()
    const stats = deriveAnalysisStats([session], SETTINGS, NOW)
    expect(stats.densityMatrix).toHaveLength(7)
    stats.densityMatrix.forEach(row => {
      expect(row).toHaveLength(24)
      row.forEach(v => expect(v).toBeGreaterThanOrEqual(0))
    })
  })
})
