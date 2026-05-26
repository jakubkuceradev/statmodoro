import type { SessionType } from './timer'

export type { SessionType }

export type SessionMode = 'pomodoro' | 'flowmodoro'

export type EndReason = 'natural' | 'skip' | 'abandoned' | 'stopped'

export interface SessionRecord {
  schemaVersion: 1
  id: string
  startedAt: number
  endedAt: number
  netActiveMs: number
  pauses: { pausedAt: number; resumedAt: number }[]
  sessionType: SessionType
  mode: SessionMode
  endReason: EndReason
  sessionIndex: number
  plannedDuration: number
  flowmodoroDerivedBreakMs?: number
  tzOffsetMinutes: number
}
