import { DEFAULT_SETTINGS } from '../lib/settings/defaults'
import type { Settings } from '../types/settings'
import type { TimerState } from '../types/timer'
import type { SessionRecord } from '../types/session'

export function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return { ...DEFAULT_SETTINGS, ...overrides }
}

let _recordCounter = 0
export function makeRecord(overrides: Partial<SessionRecord> = {}): SessionRecord {
  const id = `rec-${++_recordCounter}`
  const startedAt = new Date('2025-06-15T09:00:00.000Z').getTime()
  return {
    schemaVersion: 1,
    id,
    startedAt,
    endedAt: startedAt + 25 * 60_000,
    netActiveMs: 25 * 60_000,
    pauses: [],
    sessionType: 'focus',
    mode: 'pomodoro',
    endReason: 'natural',
    sessionIndex: 1,
    plannedDuration: 25 * 60_000,
    tzOffsetMinutes: 0,
    ...overrides,
  }
}

export function makeState(overrides: Partial<TimerState> = {}): TimerState {
  const s = makeSettings()
  return {
    phase: 'idle',
    loopPosition: 0,
    sessionType: 'focus',
    plannedDuration: s.focusDuration * 60_000,
    remainingMs: s.focusDuration * 60_000,
    endTimestamp: null,
    currentSessionEvents: [],
    currentSessionId: null,
    ...overrides,
  }
}
