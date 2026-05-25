import { DEFAULT_SETTINGS } from '../lib/settings/defaults'
import type { Settings } from '../types/settings'
import type { TimerState } from '../types/timer'

export function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return { ...DEFAULT_SETTINGS, ...overrides }
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
