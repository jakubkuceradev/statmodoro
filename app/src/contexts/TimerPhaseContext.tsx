import { createContext, useContext, useReducer, useState, useEffect, useRef, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { TimerState, TimerAction } from '../types/timer'
import type { Settings } from '../types/settings'
import { reducer } from '../lib/timer/reducer'
import { useSettings } from './SettingsContext'

const TIMER_KEY = 'statmodoro:timer'

const makeInitialState = (settings: Settings): TimerState => ({
  phase: 'idle',
  loopPosition: 0,
  sessionType: 'focus',
  plannedDuration: settings.focusDuration * 60_000,
  remainingMs: settings.focusDuration * 60_000,
  endTimestamp: null,
  currentSessionEvents: [],
  currentSessionId: null,
})

const loadSavedState = (settings: Settings): TimerState => {
  try {
    const raw = localStorage.getItem(TIMER_KEY)
    if (raw) return JSON.parse(raw) as TimerState
  } catch {}
  return makeInitialState(settings)
}

interface TimerPhaseContextValue {
  state: TimerState
  endTimestamp: number | null
  dispatch: (action: TimerAction) => void
}

const TimerPhaseContext = createContext<TimerPhaseContextValue | null>(null)

export const TimerPhaseProvider = ({ children }: { children: ReactNode }) => {
  const { settings } = useSettings()
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  // Computed once on first render via ref to avoid re-running in the lazy initializer
  const initialRef = useRef<TimerState | null>(null)
  if (initialRef.current === null) {
    initialRef.current = loadSavedState(settings)
  }

  const [state, baseDispatch] = useReducer(
    (s: TimerState, a: TimerAction) => reducer(s, a, settingsRef.current),
    initialRef.current,
  )

  const [endTimestamp, setEndTimestamp] = useState<number | null>(
    initialRef.current.endTimestamp ?? null,
  )
  const endTimestampRef = useRef<number | null>(endTimestamp)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    endTimestampRef.current = endTimestamp
  }, [endTimestamp])

  // Dispatch SETTINGS_CHANGED when settings object reference changes
  const prevSettingsRef = useRef(settings)
  useEffect(() => {
    if (prevSettingsRef.current !== settings) {
      prevSettingsRef.current = settings
      baseDispatch({ type: 'SETTINGS_CHANGED', settings })
    }
  }, [settings])

  // Persist timer state + active endTimestamp to localStorage
  useEffect(() => {
    localStorage.setItem(TIMER_KEY, JSON.stringify({ ...state, endTimestamp }))
  }, [state, endTimestamp])

  // Set/clear endTimestamp when the phase transitions between running and not-running.
  // Uses a prevPhase ref so it skips the mount fire (preserving any restored endTimestamp).
  const prevPhaseRef = useRef(state.phase)
  useEffect(() => {
    const prev = prevPhaseRef.current
    prevPhaseRef.current = state.phase
    if (prev === state.phase) return

    const isRunning = state.phase === 'focus_running' || state.phase === 'break_running'
    if (isRunning) {
      const ts = Date.now() + stateRef.current.remainingMs
      endTimestampRef.current = ts
      setEndTimestamp(ts)
    } else {
      endTimestampRef.current = null
      setEndTimestamp(null)
    }
  }, [state.phase])

  // On tab/app restore, check whether the running session already expired
  useEffect(() => {
    const onVisible = () => {
      const { phase } = stateRef.current
      const isRunning = phase === 'focus_running' || phase === 'break_running'
      if (isRunning && endTimestampRef.current !== null && Date.now() >= endTimestampRef.current) {
        baseDispatch({ type: 'SESSION_END' })
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // Wrapped dispatch: captures live remaining before a pause transition so the
  // reducer state reflects actual elapsed time rather than the stale initial value.
  const dispatch = useCallback((action: TimerAction) => {
    const now = Date.now()
    const { phase } = stateRef.current
    const isRunning = phase === 'focus_running' || phase === 'break_running'

    if ((action.type === 'TAP_RING' || action.type === 'STOP') && isRunning) {
      const liveRemaining = endTimestampRef.current !== null
        ? Math.max(0, endTimestampRef.current - now)
        : stateRef.current.remainingMs
      baseDispatch({
        type: 'RESTORE',
        state: { ...stateRef.current, remainingMs: liveRemaining, endTimestamp: null },
      })
    }

    baseDispatch(action)
  }, [])

  return (
    <TimerPhaseContext.Provider value={{ state, endTimestamp, dispatch }}>
      {children}
    </TimerPhaseContext.Provider>
  )
}

export const useTimerPhase = () => {
  const ctx = useContext(TimerPhaseContext)
  if (!ctx) throw new Error('useTimerPhase must be inside TimerPhaseProvider')
  return ctx
}
