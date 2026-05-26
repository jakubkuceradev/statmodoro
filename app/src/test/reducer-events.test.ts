import { describe, it, expect } from 'vitest'
import { reducer } from '../lib/timer/reducer'
import { makeSettings, makeState } from './helpers'

describe('session event tracking', () => {
  it('assigns a currentSessionId and appends a start event when PLAY_PAUSE starts from idle', () => {
    const next = reducer(makeState({ phase: 'idle' }), { type: 'PLAY_PAUSE', now: 1000 }, makeSettings())
    expect(next.currentSessionId).toBeTruthy()
    expect(next.currentSessionEvents).toEqual([{ type: 'start', timestamp: 1000 }])
  })

  it('assigns a currentSessionId and appends a start event when SKIP starts from idle', () => {
    const next = reducer(makeState({ phase: 'idle' }), { type: 'SKIP', now: 2000 }, makeSettings())
    expect(next.currentSessionId).toBeTruthy()
    expect(next.currentSessionEvents).toEqual([{ type: 'start', timestamp: 2000 }])
  })

  it('appends a pause event when focus_running → focus_paused', () => {
    const state = makeState({
      phase: 'focus_running',
      currentSessionId: 'abc',
      currentSessionEvents: [{ type: 'start', timestamp: 0 }],
    })
    const next = reducer(state, { type: 'PLAY_PAUSE', now: 5000 }, makeSettings())
    expect(next.currentSessionEvents.at(-1)).toEqual({ type: 'pause', timestamp: 5000 })
  })

  it('appends a resume event when focus_paused → focus_running', () => {
    const state = makeState({
      phase: 'focus_paused',
      currentSessionId: 'abc',
      currentSessionEvents: [
        { type: 'start', timestamp: 0 },
        { type: 'pause', timestamp: 5000 },
      ],
    })
    const next = reducer(state, { type: 'PLAY_PAUSE', now: 8000 }, makeSettings())
    expect(next.currentSessionEvents.at(-1)).toEqual({ type: 'resume', timestamp: 8000 })
  })

  it('appends pause and resume events for break sessions', () => {
    const state = makeState({
      phase: 'break_running',
      sessionType: 'short_break',
      currentSessionId: 'brk',
      currentSessionEvents: [{ type: 'start', timestamp: 0 }],
    })
    const paused = reducer(state, { type: 'PLAY_PAUSE', now: 3000 }, makeSettings())
    expect(paused.currentSessionEvents.at(-1)).toEqual({ type: 'pause', timestamp: 3000 })
    const resumed = reducer(paused, { type: 'PLAY_PAUSE', now: 7000 }, makeSettings())
    expect(resumed.currentSessionEvents.at(-1)).toEqual({ type: 'resume', timestamp: 7000 })
  })

  it('clears events and id on STOP', () => {
    const state = makeState({
      phase: 'focus_running',
      currentSessionId: 'abc',
      currentSessionEvents: [{ type: 'start', timestamp: 0 }],
    })
    const next = reducer(state, { type: 'STOP', now: 5000 }, makeSettings())
    expect(next.currentSessionId).toBeNull()
    expect(next.currentSessionEvents).toHaveLength(0)
  })

  it('clears events on SESSION_END so the new phase starts fresh', () => {
    const state = makeState({
      phase: 'focus_running',
      currentSessionId: 'abc',
      currentSessionEvents: [{ type: 'start', timestamp: 0 }],
    })
    const next = reducer(state, { type: 'SESSION_END', now: 25_000 }, makeSettings())
    expect(next.currentSessionEvents).toHaveLength(0)
  })

  it('starts a new break session (new id + start event) when autoStartBreaks is on', () => {
    const state = makeState({
      phase: 'focus_running',
      currentSessionId: 'focus-id',
      currentSessionEvents: [{ type: 'start', timestamp: 0 }],
    })
    const settings = makeSettings({ autoStartBreaks: true })
    const next = reducer(state, { type: 'SESSION_END', now: 25_000 }, settings)
    expect(next.phase).toBe('break_running')
    expect(next.currentSessionId).not.toBe('focus-id')
    expect(next.currentSessionId).toBeTruthy()
    expect(next.currentSessionEvents).toEqual([{ type: 'start', timestamp: 25_000 }])
  })

  it('starts a new focus session (new id + start event) when autoStartFocus is on after a break ends', () => {
    const state = makeState({
      phase: 'break_running',
      sessionType: 'short_break',
      currentSessionId: 'break-id',
      currentSessionEvents: [{ type: 'start', timestamp: 0 }],
    })
    const settings = makeSettings({ autoStartFocus: true })
    const next = reducer(state, { type: 'SESSION_END', now: 5_000 }, settings)
    expect(next.phase).toBe('focus_running')
    expect(next.currentSessionId).not.toBe('break-id')
    expect(next.currentSessionEvents).toEqual([{ type: 'start', timestamp: 5_000 }])
  })
})
