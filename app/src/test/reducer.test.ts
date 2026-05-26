import { describe, it, expect } from 'vitest'
import { reducer } from '../lib/timer/reducer'
import { makeSettings, makeState } from './helpers'

describe('SETTINGS_CHANGED', () => {
  it('does not change plannedDuration or session end time for the current session', () => {
    const endTimestamp = Date.now() + 900_000
    const state = makeState({ phase: 'focus_running', remainingMs: 900_000, plannedDuration: 25 * 60_000, endTimestamp })
    const newSettings = makeSettings({ focusDuration: 30 })
    const next = reducer(state, { type: 'SETTINGS_CHANGED', settings: newSettings }, newSettings)
    expect(next.plannedDuration).toBe(25 * 60_000)
    expect(next.endTimestamp).toBe(endTimestamp)
    expect(next.remainingMs).toBe(900_000)
  })

  it('clamps loopPosition when sessionsPerLoop shrinks below current position', () => {
    const state = makeState({ loopPosition: 3 })
    const newSettings = makeSettings({ sessionsPerLoop: 2 })
    const next = reducer(state, { type: 'SETTINGS_CHANGED', settings: newSettings }, newSettings)
    expect(next.loopPosition).toBe(1)
  })
})

describe('SKIP', () => {
  it('advances from focus to a break, always running regardless of autoStartBreaks', () => {
    const next = reducer(makeState({ phase: 'focus_running' }), { type: 'SKIP' }, makeSettings({ autoStartBreaks: false }))
    expect(next.phase).toBe('break_running')
    expect(next.sessionType).toBe('short_break')
  })

  it('advances from break to focus, always running regardless of autoStartFocus', () => {
    const next = reducer(makeState({ phase: 'break_running', sessionType: 'short_break' }), { type: 'SKIP' }, makeSettings({ autoStartFocus: false }))
    expect(next.phase).toBe('focus_running')
    expect(next.sessionType).toBe('focus')
  })
})

describe('LOOP_RESET', () => {
  it('resets loopPosition to 0 without changing phase or remainingMs', () => {
    const remaining = 900_000
    const state = makeState({ phase: 'focus_running', loopPosition: 2, remainingMs: remaining })
    const next = reducer(state, { type: 'LOOP_RESET' }, makeSettings())
    expect(next.loopPosition).toBe(0)
    expect(next.phase).toBe('focus_running')
    expect(next.remainingMs).toBe(remaining)
  })
})

describe('loop cycling', () => {
  it('increments loopPosition when a non-last break ends', () => {
    const settings = makeSettings({ sessionsPerLoop: 4 })
    const next = reducer(makeState({ phase: 'break_running', sessionType: 'short_break', loopPosition: 1 }), { type: 'SESSION_END' }, settings)
    expect(next.loopPosition).toBe(2)
  })

  it('resets loopPosition to 0 after the long break ends', () => {
    const settings = makeSettings({ sessionsPerLoop: 4 })
    const next = reducer(makeState({ phase: 'break_running', sessionType: 'long_break', loopPosition: 3 }), { type: 'SESSION_END' }, settings)
    expect(next.loopPosition).toBe(0)
  })
})

describe('SESSION_END', () => {
  it('transitions focus to short_break paused when autoStartBreaks is off', () => {
    const next = reducer(makeState({ phase: 'focus_running' }), { type: 'SESSION_END' }, makeSettings({ autoStartBreaks: false }))
    expect(next.phase).toBe('break_paused')
    expect(next.sessionType).toBe('short_break')
  })

  it('transitions focus to short_break running when autoStartBreaks is on', () => {
    const next = reducer(makeState({ phase: 'focus_running' }), { type: 'SESSION_END' }, makeSettings({ autoStartBreaks: true }))
    expect(next.phase).toBe('break_running')
    expect(next.sessionType).toBe('short_break')
  })

  it('uses long_break for the last session in the loop', () => {
    const settings = makeSettings({ sessionsPerLoop: 4 })
    const next = reducer(makeState({ phase: 'focus_running', loopPosition: 3 }), { type: 'SESSION_END' }, settings)
    expect(next.sessionType).toBe('long_break')
  })

  it('transitions break to focus_paused when autoStartFocus is off', () => {
    const next = reducer(makeState({ phase: 'break_running', sessionType: 'short_break' }), { type: 'SESSION_END' }, makeSettings({ autoStartFocus: false }))
    expect(next.phase).toBe('focus_paused')
    expect(next.sessionType).toBe('focus')
  })

  it('transitions break to focus_running when autoStartFocus is on', () => {
    const next = reducer(makeState({ phase: 'break_running', sessionType: 'short_break' }), { type: 'SESSION_END' }, makeSettings({ autoStartFocus: true }))
    expect(next.phase).toBe('focus_running')
    expect(next.sessionType).toBe('focus')
  })
})

describe('STOP', () => {
  it('from idle: remains idle with loopPosition reset to 0', () => {
    const next = reducer(makeState({ phase: 'idle', loopPosition: 2 }), { type: 'STOP' }, makeSettings())
    expect(next.phase).toBe('idle')
    expect(next.loopPosition).toBe(0)
  })

  it('from idle: resets remainingMs and plannedDuration to focus duration from settings', () => {
    const settings = makeSettings({ focusDuration: 30 })
    const next = reducer(makeState({ phase: 'idle', remainingMs: 25 * 60_000 }), { type: 'STOP' }, settings)
    expect(next.remainingMs).toBe(30 * 60_000)
    expect(next.plannedDuration).toBe(30 * 60_000)
  })

  it('from focus_running: transitions to focus_paused', () => {
    const next = reducer(makeState({ phase: 'focus_running' }), { type: 'STOP' }, makeSettings())
    expect(next.phase).toBe('focus_paused')
  })

  it('from focus_running: preserves loopPosition', () => {
    const next = reducer(makeState({ phase: 'focus_running', loopPosition: 2 }), { type: 'STOP' }, makeSettings())
    expect(next.loopPosition).toBe(2)
  })

  it('from focus_running: resets remainingMs to full focus duration', () => {
    const settings = makeSettings({ focusDuration: 25 })
    const next = reducer(makeState({ phase: 'focus_running', remainingMs: 300_000 }), { type: 'STOP' }, settings)
    expect(next.remainingMs).toBe(25 * 60_000)
  })

  it('from focus_running: clears currentSessionEvents', () => {
    const state = makeState({ phase: 'focus_running', currentSessionEvents: [{ type: 'start', timestamp: Date.now() }] })
    const next = reducer(state, { type: 'STOP' }, makeSettings())
    expect(next.currentSessionEvents).toHaveLength(0)
  })

  it('from focus_running: clears currentSessionId', () => {
    const next = reducer(makeState({ phase: 'focus_running', currentSessionId: 'abc-123' }), { type: 'STOP' }, makeSettings())
    expect(next.currentSessionId).toBeNull()
  })

  it('from focus_paused mid-session: transitions to focus_paused at full duration', () => {
    const settings = makeSettings({ focusDuration: 25 })
    const state = makeState({ phase: 'focus_paused', remainingMs: 300_000, plannedDuration: 25 * 60_000 })
    const next = reducer(state, { type: 'STOP' }, settings)
    expect(next.phase).toBe('focus_paused')
    expect(next.remainingMs).toBe(25 * 60_000)
  })

  it('from focus_paused already at full duration (double-stop): goes to idle and resets loop', () => {
    const settings = makeSettings({ focusDuration: 25 })
    const state = makeState({ phase: 'focus_paused', loopPosition: 2, remainingMs: 25 * 60_000, plannedDuration: 25 * 60_000 })
    const next = reducer(state, { type: 'STOP' }, settings)
    expect(next.phase).toBe('idle')
    expect(next.loopPosition).toBe(0)
  })

  it('from break_running: transitions to break_paused', () => {
    const next = reducer(makeState({ phase: 'break_running', sessionType: 'short_break' }), { type: 'STOP' }, makeSettings())
    expect(next.phase).toBe('break_paused')
    expect(next.sessionType).toBe('short_break')
  })

  it('from break_running: preserves loopPosition', () => {
    const next = reducer(makeState({ phase: 'break_running', sessionType: 'short_break', loopPosition: 1 }), { type: 'STOP' }, makeSettings())
    expect(next.loopPosition).toBe(1)
  })

  it('from break_running: resets remainingMs to the break planned duration', () => {
    const state = makeState({ phase: 'break_running', sessionType: 'short_break', plannedDuration: 5 * 60_000, remainingMs: 3 * 60_000 })
    const next = reducer(state, { type: 'STOP' }, makeSettings())
    expect(next.remainingMs).toBe(5 * 60_000)
  })

  it('from break_paused: transitions to break_paused at full break duration', () => {
    const state = makeState({ phase: 'break_paused', sessionType: 'short_break', plannedDuration: 5 * 60_000, remainingMs: 2 * 60_000 })
    const next = reducer(state, { type: 'STOP' }, makeSettings())
    expect(next.phase).toBe('break_paused')
    expect(next.remainingMs).toBe(5 * 60_000)
  })

  it('from break_paused already at full duration (double-stop): goes to idle and resets loop', () => {
    const state = makeState({ phase: 'break_paused', sessionType: 'short_break', loopPosition: 1, plannedDuration: 5 * 60_000, remainingMs: 5 * 60_000 })
    const next = reducer(state, { type: 'STOP' }, makeSettings())
    expect(next.phase).toBe('idle')
    expect(next.loopPosition).toBe(0)
  })
})

describe('TAP_RING', () => {
  it('starts a focus session from idle', () => {
    const settings = makeSettings()
    const next = reducer(makeState(), { type: 'TAP_RING' }, settings)
    expect(next.phase).toBe('focus_running')
    expect(next.sessionType).toBe('focus')
    expect(next.remainingMs).toBe(settings.focusDuration * 60_000)
  })

  it('preserves loopPosition when starting from idle', () => {
    const next = reducer(makeState({ phase: 'idle', loopPosition: 2 }), { type: 'TAP_RING' }, makeSettings())
    expect(next.loopPosition).toBe(2)
  })

  it('pauses a running focus session', () => {
    const next = reducer(makeState({ phase: 'focus_running' }), { type: 'TAP_RING' }, makeSettings())
    expect(next.phase).toBe('focus_paused')
  })

  it('resumes a paused focus session', () => {
    const next = reducer(makeState({ phase: 'focus_paused' }), { type: 'TAP_RING' }, makeSettings())
    expect(next.phase).toBe('focus_running')
  })

  it('pauses a running break', () => {
    const next = reducer(makeState({ phase: 'break_running' }), { type: 'TAP_RING' }, makeSettings())
    expect(next.phase).toBe('break_paused')
  })

  it('resumes a paused break', () => {
    const next = reducer(makeState({ phase: 'break_paused' }), { type: 'TAP_RING' }, makeSettings())
    expect(next.phase).toBe('break_running')
  })
})
