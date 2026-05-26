import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { collapseEvents } from '../lib/db/sessions'
import { writeSession, getAllSessions, clearAllSessions } from '../lib/db/sessions'
import { migrate } from '../lib/db/migrations'
import { _resetDb } from '../lib/db/index'
import type { TimerEvent } from '../types/timer'
import type { SessionRecord } from '../types/session'

function makeEvents(pairs: [TimerEvent['type'], number][]): TimerEvent[] {
  return pairs.map(([type, timestamp]) => ({ type, timestamp }))
}

const BASE_META = {
  id: 'test-id',
  sessionType: 'focus' as const,
  mode: 'pomodoro' as const,
  endReason: 'natural' as const,
  sessionIndex: 1,
  plannedDuration: 25 * 60_000,
  tzOffsetMinutes: 60,
}

beforeEach(() => {
  ;(globalThis as any).indexedDB = new IDBFactory()
  _resetDb()
})

describe('collapseEvents', () => {
  it('sets startedAt from the first start event', () => {
    const events = makeEvents([['start', 1000], ['end', 26000]])
    const record = collapseEvents(events, BASE_META)
    expect(record.startedAt).toBe(1000)
  })

  it('sets endedAt from the terminal end event', () => {
    const events = makeEvents([['start', 1000], ['end', 26000]])
    const record = collapseEvents(events, BASE_META)
    expect(record.endedAt).toBe(26000)
  })

  it('sets netActiveMs equal to wall time when there are no pauses', () => {
    const events = makeEvents([['start', 0], ['end', 25 * 60_000]])
    const record = collapseEvents(events, BASE_META)
    expect(record.netActiveMs).toBe(25 * 60_000)
    expect(record.pauses).toEqual([])
  })

  it('subtracts a single pause window from netActiveMs', () => {
    const events = makeEvents([
      ['start',  0],
      ['pause',  60_000],
      ['resume', 90_000],   // 30s pause
      ['end',    25 * 60_000],
    ])
    const record = collapseEvents(events, BASE_META)
    expect(record.netActiveMs).toBe(25 * 60_000 - 30_000)
    expect(record.pauses).toEqual([{ pausedAt: 60_000, resumedAt: 90_000 }])
  })

  it('closes a dangling pause at endedAt when the session ended while paused', () => {
    const events = makeEvents([
      ['start',  0],
      ['pause',  60_000],
      ['end',    90_000],  // ended while still paused — 30s pause window
    ])
    const record = collapseEvents(events, BASE_META)
    expect(record.netActiveMs).toBe(60_000)  // only 60s active before the pause
    expect(record.pauses).toEqual([{ pausedAt: 60_000, resumedAt: 90_000 }])
  })

  it('captures multiple pause intervals and subtracts all gaps from netActiveMs', () => {
    const events = makeEvents([
      ['start',  0],
      ['pause',  10_000],
      ['resume', 20_000],   // 10s pause
      ['pause',  30_000],
      ['resume', 50_000],   // 20s pause
      ['end',    100_000],
    ])
    const record = collapseEvents(events, BASE_META)
    expect(record.netActiveMs).toBe(100_000 - 10_000 - 20_000)
    expect(record.pauses).toEqual([
      { pausedAt: 10_000, resumedAt: 20_000 },
      { pausedAt: 30_000, resumedAt: 50_000 },
    ])
  })

  it('passes all metadata fields through to the record unchanged', () => {
    const events = makeEvents([['start', 0], ['end', 1000]])
    const meta = {
      ...BASE_META,
      sessionType: 'short_break' as const,
      mode: 'flowmodoro' as const,
      endReason: 'skip' as const,
      sessionIndex: 3,
      plannedDuration: 5 * 60_000,
      tzOffsetMinutes: -300,
    }
    const record = collapseEvents(events, meta)
    expect(record.sessionType).toBe('short_break')
    expect(record.mode).toBe('flowmodoro')
    expect(record.endReason).toBe('skip')
    expect(record.sessionIndex).toBe(3)
    expect(record.plannedDuration).toBe(5 * 60_000)
    expect(record.tzOffsetMinutes).toBe(-300)
  })

  it('always sets schemaVersion to 1', () => {
    const events = makeEvents([['start', 0], ['end', 1000]])
    const record = collapseEvents(events, BASE_META)
    expect(record.schemaVersion).toBe(1)
  })

  it('omits flowmodoroDerivedBreakMs when not provided', () => {
    const events = makeEvents([['start', 0], ['end', 1000]])
    const record = collapseEvents(events, BASE_META)
    expect(record.flowmodoroDerivedBreakMs).toBeUndefined()
  })

  it('includes flowmodoroDerivedBreakMs when provided', () => {
    const events = makeEvents([['start', 0], ['end', 1000]])
    const record = collapseEvents(events, { ...BASE_META, flowmodoroDerivedBreakMs: 5 * 60_000 })
    expect(record.flowmodoroDerivedBreakMs).toBe(5 * 60_000)
  })
})

describe('getAllSessions', () => {
  it('returns an empty array when the store has no records', async () => {
    const sessions = await getAllSessions()
    expect(sessions).toEqual([])
  })
})

describe('writeSession + getAllSessions', () => {
  it('round-trips a session record with all fields intact', async () => {
    const events = makeEvents([
      ['start',  1000],
      ['pause',  10_000],
      ['resume', 15_000],
      ['end',    30_000],
    ])
    await writeSession(events, BASE_META)
    const sessions = await getAllSessions()
    expect(sessions).toHaveLength(1)
    const r = sessions[0]
    expect(r.id).toBe('test-id')
    expect(r.startedAt).toBe(1000)
    expect(r.endedAt).toBe(30_000)
    expect(r.netActiveMs).toBe(30_000 - 1000 - (15_000 - 10_000))
    expect(r.pauses).toEqual([{ pausedAt: 10_000, resumedAt: 15_000 }])
    expect(r.sessionType).toBe('focus')
    expect(r.mode).toBe('pomodoro')
    expect(r.endReason).toBe('natural')
    expect(r.schemaVersion).toBe(1)
  })

  it('stores multiple sessions and returns all of them', async () => {
    await writeSession(makeEvents([['start', 0], ['end', 1000]]), { ...BASE_META, id: 'a' })
    await writeSession(makeEvents([['start', 2000], ['end', 3000]]), { ...BASE_META, id: 'b' })
    await writeSession(makeEvents([['start', 4000], ['end', 5000]]), { ...BASE_META, id: 'c' })
    const sessions = await getAllSessions()
    expect(sessions).toHaveLength(3)
    expect(sessions.map(s => s.id).sort()).toEqual(['a', 'b', 'c'])
  })
})

describe('clearAllSessions', () => {
  it('removes all records; getAllSessions returns empty afterwards', async () => {
    await writeSession(makeEvents([['start', 0], ['end', 1000]]), { ...BASE_META, id: 'x' })
    await writeSession(makeEvents([['start', 2000], ['end', 3000]]), { ...BASE_META, id: 'y' })
    await clearAllSessions()
    const sessions = await getAllSessions()
    expect(sessions).toEqual([])
  })
})

describe('migrate', () => {
  it('passes a v1 record through unchanged', () => {
    const record: SessionRecord = {
      schemaVersion: 1,
      id: 'abc',
      startedAt: 0,
      endedAt: 1000,
      netActiveMs: 1000,
      pauses: [],
      sessionType: 'focus',
      mode: 'pomodoro',
      endReason: 'natural',
      sessionIndex: 1,
      plannedDuration: 25 * 60_000,
      tzOffsetMinutes: 0,
    }
    expect(migrate(record)).toEqual(record)
  })
})
