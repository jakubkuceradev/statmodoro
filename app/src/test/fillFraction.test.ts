import { describe, it, expect } from 'vitest'
import { computeFillFraction } from '../lib/timer/fillFraction'
import { makeSettings, makeState } from './helpers'

describe('computeFillFraction', () => {
  it('returns 0 when idle', () => {
    expect(computeFillFraction(makeState({ phase: 'idle' }), makeSettings())).toBe(0)
  })

  it('fills from 0 to 1 in pomodoro mode', () => {
    const planned = 25 * 60_000
    const remaining = 10 * 60_000
    const state = makeState({ phase: 'focus_running', plannedDuration: planned, remainingMs: remaining })
    expect(computeFillFraction(state, makeSettings({ mode: 'pomodoro' }))).toBeCloseTo(1 - remaining / planned)
  })

  it('fills linearly to 0.75 at the target in flowmodoro focus', () => {
    const planned = 25 * 60_000
    const state = makeState({
      phase: 'focus_running',
      sessionType: 'focus',
      plannedDuration: planned,
      remainingMs: 0,
    })
    expect(computeFillFraction(state, makeSettings({ mode: 'flowmodoro' }))).toBeCloseTo(0.75)
  })

  it('approaches 1 asymptotically past the target in flowmodoro focus', () => {
    const planned = 25 * 60_000
    const state = makeState({
      phase: 'focus_running',
      sessionType: 'focus',
      plannedDuration: planned,
      remainingMs: -planned,
    })
    const fill = computeFillFraction(state, makeSettings({ mode: 'flowmodoro' }))
    expect(fill).toBeGreaterThan(0.75)
    expect(fill).toBeLessThan(1)
  })
})
