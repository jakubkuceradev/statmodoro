import { render, screen, act, waitFor, fireEvent } from '@testing-library/react'
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import App from '../App'
import { SETTINGS_KEY } from '../contexts/SettingsContext'
import { getAllSessions } from '../lib/db/sessions'
import { _resetDb } from '../lib/db/index'

vi.mock('../lib/audio/index', () => ({
  audioManager: { play: vi.fn(), setVolume: vi.fn(), load: vi.fn().mockResolvedValue(undefined) },
}))
vi.mock('../lib/notifications/index', () => ({
  notify: vi.fn(),
  isGranted: vi.fn(() => false),
  requestPermission: vi.fn().mockResolvedValue(false),
}))

beforeEach(() => {
  localStorage.clear()
  ;(globalThis as any).indexedDB = new IDBFactory()
  _resetDb()
})

afterEach(() => {
  vi.useRealTimers()
})

function setSettings(patch: Record<string, unknown>) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(patch))
}

// Vitest's full fake-timer suite stubs queueMicrotask/setTimeout which fake-indexeddb
// needs to fire IDB completion callbacks. Only fake what the timer context requires.
const fakeDateAndIntervals = () =>
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })

describe('session persistence', () => {
  it('writes a focus record to IndexedDB when a session expires naturally', async () => {
    setSettings({ focusDuration: 1 })
    fakeDateAndIntervals()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await act(async () => { vi.advanceTimersByTime(61_000) })
    await waitFor(async () => {
      const sessions = await getAllSessions()
      expect(sessions.some(s => s.sessionType === 'focus' && s.endReason === 'natural')).toBe(true)
    })
  })

  it('records a real startedAt timestamp (not zero) and correct netActiveMs on natural expiry', async () => {
    setSettings({ focusDuration: 1 })
    fakeDateAndIntervals()
    const before = Date.now()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await act(async () => { vi.advanceTimersByTime(61_000) })
    await waitFor(async () => {
      const sessions = await getAllSessions()
      const focus = sessions.find(s => s.sessionType === 'focus')
      expect(focus?.startedAt).toBeGreaterThanOrEqual(before)
      expect(focus?.netActiveMs).toBe(60_000) // equals plannedDuration, no pauses
    })
  })

  it('writes a focus record with endReason=skip when the user skips', async () => {
    setSettings({ focusDuration: 25, countSessionAfterPercent: 0 })
    fakeDateAndIntervals()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await act(async () => { vi.advanceTimersByTime(5_000) })
    fireEvent.click(screen.getByRole('button', { name: /skip/i }))
    await waitFor(async () => {
      const sessions = await getAllSessions()
      expect(sessions.some(s => s.sessionType === 'focus' && s.endReason === 'skip')).toBe(true)
    })
  })

  it('writes a break record when a break expires naturally', async () => {
    setSettings({ focusDuration: 1, shortBreakDuration: 1, autoStartBreaks: true })
    fakeDateAndIntervals()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await act(async () => { vi.advanceTimersByTime(61_000) }) // focus expires
    await act(async () => { vi.advanceTimersByTime(61_000) }) // break expires
    await waitFor(async () => {
      const sessions = await getAllSessions()
      expect(sessions.some(s => s.sessionType === 'short_break')).toBe(true)
    })
  })

  it('does not write a record when the user skips a break', async () => {
    setSettings({ focusDuration: 1, autoStartBreaks: true, countSessionAfterPercent: 0 })
    fakeDateAndIntervals()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await act(async () => { vi.advanceTimersByTime(61_000) }) // focus expires → break auto-starts
    fireEvent.click(screen.getByRole('button', { name: /skip/i }))
    await waitFor(async () => {
      const sessions = await getAllSessions()
      expect(sessions.every(s => s.sessionType !== 'short_break')).toBe(true)
    })
  })

  it('captures a pause interval in the written focus record', async () => {
    setSettings({ focusDuration: 25, countSessionAfterPercent: 0 })
    fakeDateAndIntervals()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await act(async () => { vi.advanceTimersByTime(5_000) })
    fireEvent.click(screen.getByRole('button', { name: /pause focus/i }))
    await act(async () => { vi.advanceTimersByTime(3_000) })
    fireEvent.click(screen.getByRole('button', { name: /resume focus/i }))
    fireEvent.click(screen.getByRole('button', { name: /skip/i }))
    await waitFor(async () => {
      const sessions = await getAllSessions()
      const focus = sessions.find(s => s.sessionType === 'focus')
      expect(focus?.pauses).toHaveLength(1)
    })
  })

  it('correctly computes netActiveMs when skipping while paused', async () => {
    setSettings({ focusDuration: 25, countSessionAfterPercent: 0 })
    fakeDateAndIntervals()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await act(async () => { vi.advanceTimersByTime(5_000) })   // 5s active
    fireEvent.click(screen.getByRole('button', { name: /pause focus/i }))
    await act(async () => { vi.advanceTimersByTime(10_000) })  // 10s paused
    fireEvent.click(screen.getByRole('button', { name: /skip/i })) // skip while paused
    await waitFor(async () => {
      const sessions = await getAllSessions()
      const focus = sessions.find(s => s.sessionType === 'focus')
      expect(focus?.netActiveMs).toBe(5_000)  // paused time not counted
      expect(focus?.pauses).toHaveLength(1)
    })
  })

  it('writes a focus record with endReason=stopped when the user stops mid-session', async () => {
    setSettings({ focusDuration: 25, countSessionAfterPercent: 0 })
    fakeDateAndIntervals()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await act(async () => { vi.advanceTimersByTime(5_000) })
    fireEvent.click(screen.getByRole('button', { name: /stop/i }))
    await waitFor(async () => {
      const sessions = await getAllSessions()
      expect(sessions.some(s => s.sessionType === 'focus' && s.endReason === 'stopped')).toBe(true)
    })
  })

  it('does not write a record when stopping from the reset-paused state (double-stop)', async () => {
    setSettings({ focusDuration: 25, countSessionAfterPercent: 0 })
    fakeDateAndIntervals()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await act(async () => { vi.advanceTimersByTime(5_000) })
    fireEvent.click(screen.getByRole('button', { name: /stop/i })) // first stop → stopped record
    fireEvent.click(screen.getByRole('button', { name: /stop/i })) // second stop → idle, no record
    await waitFor(async () => {
      const sessions = await getAllSessions()
      expect(sessions.filter(s => s.endReason === 'stopped')).toHaveLength(1)
    })
  })

  it('writes endReason=abandoned when the timer expired more than plannedDuration+10min ago', async () => {
    setSettings({ focusDuration: 1, countSessionAfterPercent: 0 })
    fakeDateAndIntervals()
    const t0 = Date.now()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start focus/i }))
    // Flush effects so endTimestamp is set, but advance only 100ms so the
    // timer (60s) does NOT expire — no SESSION_END fires here.
    await act(async () => { vi.advanceTimersByTime(100) })
    // Jump Date.now() past expiry + grace without firing the interval again.
    // overdue = (t0 + 12*60_000+1_000) - (t0 + 60_000) = 11*60_000+1_000 > 10*60_000
    vi.setSystemTime(t0 + 12 * 60_000 + 1_000)
    // Simulate returning to the tab
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await waitFor(async () => {
      const sessions = await getAllSessions()
      expect(sessions.some(s => s.endReason === 'abandoned')).toBe(true)
    })
  })
})
