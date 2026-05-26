import type { Settings } from './settings'

export type TimerPhase =
  | 'idle'
  | 'focus_running'
  | 'focus_paused'
  | 'break_running'
  | 'break_paused'

export type SessionType = 'focus' | 'short_break' | 'long_break'

export type TimerEventType = 'start' | 'pause' | 'resume' | 'end'

export interface TimerEvent {
  type: TimerEventType
  timestamp: number
}

export interface TimerState {
  phase: TimerPhase
  loopPosition: number
  sessionType: SessionType
  plannedDuration: number
  remainingMs: number
  endTimestamp: number | null
  currentSessionEvents: TimerEvent[]
  currentSessionId: string | null
}

export type TimerAction =
  | { type: 'PLAY_PAUSE' }
  | { type: 'SKIP' }
  | { type: 'SESSION_END' }
  | { type: 'LOOP_RESET' }
  | { type: 'STOP' }
  | { type: 'SETTINGS_CHANGED'; settings: Settings }
  | { type: 'ABANDONED_SESSION'; now: number }
  | { type: 'RESTORE'; state: TimerState }
