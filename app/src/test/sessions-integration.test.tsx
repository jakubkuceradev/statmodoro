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
})
