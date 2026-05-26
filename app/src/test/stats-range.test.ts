import { describe, it, expect } from 'vitest'
import { deriveRangeStats } from '../lib/stats/derive'
import { makeSettings, makeRecord } from './helpers'

// June 15 2025 is a Sunday (Date.getDay() = 0). Week Mon–Sun = June 9–15.
const NOW = new Date('2025-06-15T12:00:00.000Z').getTime()
const SETTINGS = makeSettings({ dayStartHour: 0, countSessionAfterPercent: 50 })

describe('deriveRangeStats — day view', () => {
  it('returns heroMinutes=0 and 24 zero bars when there are no sessions', () => {
    const stats = deriveRangeStats([], 'day', SETTINGS, NOW)
    expect(stats.heroMinutes).toBe(0)
    expect(stats.bars).toHaveLength(24)
    expect(stats.bars.every(b => b.focusMinutes === 0)).toBe(true)
  })

  it('hero is the total focus netActiveMs in minutes for sessions bucketed to today', () => {
    const session = makeRecord({
      startedAt: new Date('2025-06-15T09:00:00.000Z').getTime(),
      endedAt:   new Date('2025-06-15T09:25:00.000Z').getTime(),
      netActiveMs: 25 * 60_000,
    })
    const stats = deriveRangeStats([session], 'day', SETTINGS, NOW)
    expect(stats.heroMinutes).toBe(25)
  })

  it("sessions from yesterday do not appear in today's hero", () => {
    const yesterday = makeRecord({
      startedAt: new Date('2025-06-14T10:00:00.000Z').getTime(),
      netActiveMs: 25 * 60_000,
    })
    const stats = deriveRangeStats([yesterday], 'day', SETTINGS, NOW)
    expect(stats.heroMinutes).toBe(0)
  })

  it('places session minutes in the bar matching the session start hour', () => {
    const session = makeRecord({
      startedAt: new Date('2025-06-15T09:00:00.000Z').getTime(),
      netActiveMs: 20 * 60_000,
    })
    const stats = deriveRangeStats([session], 'day', SETTINGS, NOW)
    const bar9 = stats.bars.find(b => b.label === '9am')!
    expect(bar9.focusMinutes).toBeGreaterThan(0)
    stats.bars.filter(b => b.label !== '9am').forEach(b => expect(b.focusMinutes).toBe(0))
  })

  it('marks only the current hour bar as isCurrent', () => {
    // NOW is 12:00 UTC, so the 12pm bar is current
    const stats = deriveRangeStats([], 'day', SETTINGS, NOW)
    const currentBars = stats.bars.filter(b => b.isCurrent)
    expect(currentBars).toHaveLength(1)
    expect(currentBars[0].label).toBe('12pm')
  })

  it('break sessions are excluded from the day hero and bars', () => {
    const breakSession = makeRecord({
      sessionType: 'short_break',
      startedAt: new Date('2025-06-15T09:00:00.000Z').getTime(),
      netActiveMs: 5 * 60_000,
    })
    const stats = deriveRangeStats([breakSession], 'day', SETTINGS, NOW)
    expect(stats.heroMinutes).toBe(0)
    expect(stats.bars.every(b => b.focusMinutes === 0)).toBe(true)
  })

  it('chip1 is the count of focus sessions today', () => {
    const s1 = makeRecord({ id: 'a', startedAt: new Date('2025-06-15T09:00:00.000Z').getTime() })
    const s2 = makeRecord({ id: 'b', startedAt: new Date('2025-06-15T11:00:00.000Z').getTime() })
    const stats = deriveRangeStats([s1, s2], 'day', SETTINGS, NOW)
    expect(stats.chip1).toContain('2')
  })
})

describe('deriveRangeStats — week view', () => {
  it('returns exactly 7 bars (Mon through Sun)', () => {
    const stats = deriveRangeStats([], 'week', SETTINGS, NOW)
    expect(stats.bars).toHaveLength(7)
    expect(stats.bars[0].label).toBe('Mon')
    expect(stats.bars[6].label).toBe('Sun')
  })

  it('places focus minutes in the bar for the correct day of the week', () => {
    // Friday June 13 is in this week
    const friday = makeRecord({
      startedAt: new Date('2025-06-13T10:00:00.000Z').getTime(),
      netActiveMs: 30 * 60_000,
    })
    const stats = deriveRangeStats([friday], 'week', SETTINGS, NOW)
    const fridayBar = stats.bars.find(b => b.label === 'Fri')!
    expect(fridayBar.focusMinutes).toBe(30)
  })

  it('marks only today (Sunday) as isCurrent', () => {
    const stats = deriveRangeStats([], 'week', SETTINGS, NOW)
    const currentBars = stats.bars.filter(b => b.isCurrent)
    expect(currentBars).toHaveLength(1)
    expect(currentBars[0].label).toBe('Sun')
  })

  it('excludes sessions from the previous week', () => {
    // Monday June 2 is NOT in the current week (June 9–15)
    const lastWeek = makeRecord({
      startedAt: new Date('2025-06-02T10:00:00.000Z').getTime(),
      netActiveMs: 25 * 60_000,
    })
    const stats = deriveRangeStats([lastWeek], 'week', SETTINGS, NOW)
    expect(stats.heroMinutes).toBe(0)
  })
})

describe('deriveRangeStats — month view', () => {
  it('returns one bar per day of June (30 bars)', () => {
    const stats = deriveRangeStats([], 'month', SETTINGS, NOW)
    expect(stats.bars).toHaveLength(30)
  })

  it('marks today (15th) as isCurrent', () => {
    const stats = deriveRangeStats([], 'month', SETTINGS, NOW)
    const current = stats.bars.filter(b => b.isCurrent)
    expect(current).toHaveLength(1)
    expect(current[0].label).toBe('15')
  })

  it('excludes sessions from the previous month', () => {
    const may = makeRecord({
      startedAt: new Date('2025-05-31T10:00:00.000Z').getTime(),
      netActiveMs: 25 * 60_000,
    })
    const stats = deriveRangeStats([may], 'month', SETTINGS, NOW)
    expect(stats.heroMinutes).toBe(0)
  })
})

describe('deriveRangeStats — year view', () => {
  it('returns exactly 12 bars', () => {
    const stats = deriveRangeStats([], 'year', SETTINGS, NOW)
    expect(stats.bars).toHaveLength(12)
    expect(stats.bars[0].label).toBe('Jan')
    expect(stats.bars[11].label).toBe('Dec')
  })

  it('marks the current month (June) as isCurrent', () => {
    const stats = deriveRangeStats([], 'year', SETTINGS, NOW)
    const current = stats.bars.filter(b => b.isCurrent)
    expect(current).toHaveLength(1)
    expect(current[0].label).toBe('Jun')
  })

  it('excludes sessions from the previous year', () => {
    const lastYear = makeRecord({
      startedAt: new Date('2024-12-31T10:00:00.000Z').getTime(),
      netActiveMs: 25 * 60_000,
    })
    const stats = deriveRangeStats([lastYear], 'year', SETTINGS, NOW)
    expect(stats.heroMinutes).toBe(0)
  })
})
