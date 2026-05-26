import { getDb } from './index'
import type { TimerEvent } from '../../types/timer'
import type { SessionMode, SessionRecord, EndReason, SessionType } from '../../types/session'

export interface CollapseOptions {
  id: string
  sessionType: SessionType
  mode: SessionMode
  endReason: EndReason
  sessionIndex: number
  plannedDuration: number
  flowmodoroDerivedBreakMs?: number
  tzOffsetMinutes: number
}

export const collapseEvents = (events: TimerEvent[], meta: CollapseOptions): SessionRecord => {
  const startedAt = events.find(e => e.type === 'start')!.timestamp
  const endedAt = events.findLast(e => e.type === 'end')!.timestamp

  const pauses: { pausedAt: number; resumedAt: number }[] = []
  let pausedAt: number | null = null

  for (const event of events) {
    if (event.type === 'pause') {
      pausedAt = event.timestamp
    } else if (event.type === 'resume' && pausedAt !== null) {
      pauses.push({ pausedAt, resumedAt: event.timestamp })
      pausedAt = null
    }
  }

  const totalPausedMs = pauses.reduce((sum, p) => sum + (p.resumedAt - p.pausedAt), 0)
  const netActiveMs = endedAt - startedAt - totalPausedMs

  return {
    schemaVersion: 1,
    id: meta.id,
    startedAt,
    endedAt,
    netActiveMs,
    pauses,
    sessionType: meta.sessionType,
    mode: meta.mode,
    endReason: meta.endReason,
    sessionIndex: meta.sessionIndex,
    plannedDuration: meta.plannedDuration,
    ...(meta.flowmodoroDerivedBreakMs !== undefined
      ? { flowmodoroDerivedBreakMs: meta.flowmodoroDerivedBreakMs }
      : {}),
    tzOffsetMinutes: meta.tzOffsetMinutes,
  }
}

export const writeSession = async (events: TimerEvent[], meta: CollapseOptions): Promise<void> => {
  const db = await getDb()
  const record = collapseEvents(events, meta)
  await db.put('sessions', record)
}

export const getAllSessions = async (): Promise<SessionRecord[]> => {
  const db = await getDb()
  return db.getAll('sessions')
}

export const clearAllSessions = async (): Promise<void> => {
  const db = await getDb()
  await db.clear('sessions')
}
