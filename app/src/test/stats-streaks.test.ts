import { describe, it, expect } from 'vitest'
import { deriveStreaks } from '../lib/stats/streak'
import { makeSettings, makeRecord } from './helpers'
import type { SessionRecord } from '../types/session'

// NOW is Sunday June 15 2025, noon UTC
const NOW = new Date('2025-06-15T12:00:00.000Z').getTime()
const SETTINGS = makeSettings({ dailyStreakGoalMinutes: 60, dayStartHour: 0, countSessionAfterPercent: 50 })

function focusOn(dateStr: string, minutes = 61): SessionRecord {
  const startedAt = new Date(`${dateStr}T10:00:00.000Z`).getTime()
  return makeRecord({
    startedAt,
    endedAt: startedAt + minutes * 60_000,
    netActiveMs: minutes * 60_000,
    plannedDuration: minutes * 60_000,
  })
}

describe('deriveStreaks', () => {
  it('returns {current: 0, best: 0} with no sessions', () => {
    expect(deriveStreaks([], SETTINGS, NOW)).toEqual({ current: 0, best: 0 })
  })

  it('returns {current: 1, best: 1} when today already meets the goal', () => {
    expect(deriveStreaks([focusOn('2025-06-15')], SETTINGS, NOW)).toEqual({ current: 1, best: 1 })
  })

  it('returns {current: 0, best: 1} when yesterday met the goal but today has not', () => {
    expect(deriveStreaks([focusOn('2025-06-14')], SETTINGS, NOW)).toEqual({ current: 0, best: 1 })
  })

  it('counts consecutive days back from the most recent active day', () => {
    const sessions = [
      focusOn('2025-06-15'),
      focusOn('2025-06-14'),
      focusOn('2025-06-13'),
    ]
    expect(deriveStreaks(sessions, SETTINGS, NOW)).toEqual({ current: 3, best: 3 })
  })

  it('resets current streak when a day in the run is missing', () => {
    const sessions = [
      focusOn('2025-06-15'), // today — standalone
      // June 14 missing (gap)
      focusOn('2025-06-13'), // older 2-day run
      focusOn('2025-06-12'),
    ]
    // current = 1 (June 15 only); best = 2 (June 12–13 run)
    expect(deriveStreaks(sessions, SETTINGS, NOW)).toEqual({ current: 1, best: 2 })
  })

  it('does not count today if the goal is not yet met', () => {
    const sessions = [
      makeRecord({
        startedAt: new Date('2025-06-15T09:00:00.000Z').getTime(),
        netActiveMs: 30 * 60_000, // only 30 min, below 60 min goal
        plannedDuration: 60 * 60_000,
      }),
      focusOn('2025-06-14'),
    ]
    expect(deriveStreaks(sessions, SETTINGS, NOW)).toEqual({ current: 0, best: 1 })
  })

  it('tracks best streak independently from current', () => {
    const sessions = [
      focusOn('2025-06-15'), // current streak = 1
      focusOn('2025-06-01'),
      focusOn('2025-05-31'),
      focusOn('2025-05-30'),
      focusOn('2025-05-29'), // older run of 4
    ]
    const result = deriveStreaks(sessions, SETTINGS, NOW)
    expect(result.current).toBe(1)
    expect(result.best).toBe(4)
  })

  it('sessions with endReason=abandoned do not count toward the streak goal', () => {
    const abandoned = makeRecord({
      startedAt: new Date('2025-06-15T09:00:00.000Z').getTime(),
      netActiveMs: 61 * 60_000,
      plannedDuration: 61 * 60_000,
      endReason: 'abandoned',
    })
    expect(deriveStreaks([abandoned], SETTINGS, NOW)).toEqual({ current: 0, best: 0 })
  })

  it('respects a non-zero dayStartHour when bucketing sessions', () => {
    // Day starts at 6am UTC; a session at 3am UTC on June 15 belongs to June 14
    const earlySession = makeRecord({
      startedAt: new Date('2025-06-15T03:00:00.000Z').getTime(),
      netActiveMs: 61 * 60_000,
      plannedDuration: 61 * 60_000,
    })
    const settings = makeSettings({ dailyStreakGoalMinutes: 60, dayStartHour: 6, countSessionAfterPercent: 50 })
    const result = deriveStreaks([earlySession], settings, NOW)
    // Session counts for June 14 → today (June 15) has no sessions → current = 0
    expect(result.current).toBe(0)
    expect(result.best).toBe(1)
  })

  it('tracks a streak across a month boundary', () => {
    const sessions = [
      focusOn('2025-06-01'),
      focusOn('2025-05-31'),
      focusOn('2025-05-30'),
    ]
    const pastNow = new Date('2025-06-01T12:00:00.000Z').getTime()
    expect(deriveStreaks(sessions, SETTINGS, pastNow)).toMatchObject({ current: 3, best: 3 })
  })

  it('only counts completed sessions toward the daily total (netActiveMs / plannedDuration >= threshold)', () => {
    const incomplete = makeRecord({
      startedAt: new Date('2025-06-15T09:00:00.000Z').getTime(),
      netActiveMs: 10 * 60_000,
      plannedDuration: 25 * 60_000, // 40% < 50% threshold → not completed
    })
    // Even though there's 10 min of focus, it doesn't count
    expect(deriveStreaks([incomplete], SETTINGS, NOW)).toEqual({ current: 0, best: 0 })
  })
})
