import { createContext, useContext, useReducer, useState, useEffect, useRef, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { TimerState, TimerAction } from '../types/timer'
import type { Settings } from '../types/settings'
import type { EndReason } from '../types/session'
import { reducer } from '../lib/timer/reducer'
import { useSettings } from './SettingsContext'
import { audioManager } from '../lib/audio/index'
import { notify, isGranted } from '../lib/notifications/index'
import { writeSession } from '../lib/db/sessions'

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

  // Load audio asset once on mount
  useEffect(() => {
    audioManager.load('/sounds/chime.wav')
  }, [])

  // Keep audio gain in sync with the volume setting
  useEffect(() => {
    audioManager.setVolume(settings.volume)
  }, [settings.volume])

  // Fire sound + desktop notification on focus↔break phase transitions
  const notifyPhaseRef = useRef(state.phase)
  useEffect(() => {
    const prev = notifyPhaseRef.current
    notifyPhaseRef.current = state.phase
    if (prev === state.phase) return

    const wasFocus = prev === 'focus_running' || prev === 'focus_paused'
    const wasBreak = prev === 'break_running' || prev === 'break_paused'
    const nowBreak = state.phase === 'break_running' || state.phase === 'break_paused'
    const nowFocus = state.phase === 'focus_running' || state.phase === 'focus_paused'

    const isFocusToBreak = wasFocus && nowBreak
    const isBreakToFocus = wasBreak && nowFocus

    if (!isFocusToBreak && !isBreakToFocus) return

    // Only fire when the timer expired naturally — if the user pressed Skip
    // they are already watching the app and alerts would be disruptive/redundant.
    if (lastActionTypeRef.current !== 'SESSION_END') return

    const s = settingsRef.current
    if (s.soundAlertsEnabled) audioManager.play()
    if (s.desktopNotificationsEnabled && isGranted()) {
      notify('Statmodoro', isFocusToBreak ? 'Time to rest!' : 'Back to focus!')
    }
  }, [state.phase])

  // On tab/app restore, check whether the running session already expired.
  // Sessions that expired more than plannedDuration+10min ago are marked abandoned
  // (user clearly wasn't present) rather than natural.
  useEffect(() => {
    const onVisible = () => {
      const { phase, plannedDuration } = stateRef.current
      const isRunning = phase === 'focus_running' || phase === 'break_running'
      if (!isRunning || endTimestampRef.current === null) return
      const now = Date.now()
      if (now < endTimestampRef.current) return
      const overdue = now - endTimestampRef.current
      if (overdue > plannedDuration + 10 * 60_000) {
        dispatch({ type: 'ABANDONED_SESSION', now })
      } else {
        dispatch({ type: 'SESSION_END' })
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // Tracks the action type that last triggered a phase change, so the notification
  // effect can distinguish natural expiry (SESSION_END) from user-initiated skips.
  const lastActionTypeRef = useRef<string | null>(null)

  // Wrapped dispatch: captures live remaining before a pause transition so the
  // reducer state reflects actual elapsed time rather than the stale initial value.
  const dispatch = useCallback((action: TimerAction) => {
    lastActionTypeRef.current = action.type

    const now = Date.now()
    const { phase } = stateRef.current
    const isRunning = phase === 'focus_running' || phase === 'break_running'

    if ((action.type === 'PLAY_PAUSE' || action.type === 'STOP') && isRunning) {
      const liveRemaining = endTimestampRef.current !== null
        ? Math.max(0, endTimestampRef.current - now)
        : stateRef.current.remainingMs
      baseDispatch({
        type: 'RESTORE',
        state: { ...stateRef.current, remainingMs: liveRemaining, endTimestamp: null },
      })
    }

    const prev = stateRef.current
    const isFocusPhase = prev.phase === 'focus_running' || prev.phase === 'focus_paused'
    const isBreakPhase = prev.phase === 'break_running' || prev.phase === 'break_paused'
    const hasSession = prev.currentSessionEvents.length > 0 && prev.currentSessionId !== null

    if (action.type === 'SESSION_END' || action.type === 'SKIP') {
      const shouldWrite = (isFocusPhase || (isBreakPhase && action.type === 'SESSION_END'))
        && hasSession

      if (shouldWrite) {
        const endTs = action.type === 'SESSION_END'
          ? (endTimestampRef.current ?? now)
          : now
        const endReason: EndReason = action.type === 'SESSION_END' ? 'natural' : 'skip'
        const events = [...prev.currentSessionEvents, { type: 'end' as const, timestamp: endTs }]
        writeSession(events, {
          id: prev.currentSessionId!,
          sessionType: prev.sessionType,
          mode: settingsRef.current.mode,
          endReason,
          sessionIndex: prev.loopPosition,
          plannedDuration: prev.plannedDuration,
          tzOffsetMinutes: -new Date().getTimezoneOffset(),
        }).catch(console.error)
      }
    }

    if (action.type === 'ABANDONED_SESSION') {
      if (hasSession) {
        const endTs = endTimestampRef.current ?? now
        const events = [...prev.currentSessionEvents, { type: 'end' as const, timestamp: endTs }]
        writeSession(events, {
          id: prev.currentSessionId!,
          sessionType: prev.sessionType,
          mode: settingsRef.current.mode,
          endReason: 'abandoned',
          sessionIndex: prev.loopPosition,
          plannedDuration: prev.plannedDuration,
          tzOffsetMinutes: -new Date().getTimezoneOffset(),
        }).catch(console.error)
      }
    }

    if (action.type === 'STOP') {
      const isPaused = prev.phase === 'focus_paused' || prev.phase === 'break_paused'
      const alreadyReset = prev.phase === 'idle' || (isPaused && prev.remainingMs >= prev.plannedDuration)
      if (!alreadyReset && hasSession) {
        const events = [...prev.currentSessionEvents, { type: 'end' as const, timestamp: now }]
        writeSession(events, {
          id: prev.currentSessionId!,
          sessionType: prev.sessionType,
          mode: settingsRef.current.mode,
          endReason: 'stopped',
          sessionIndex: prev.loopPosition,
          plannedDuration: prev.plannedDuration,
          tzOffsetMinutes: -new Date().getTimezoneOffset(),
        }).catch(console.error)
      }
    }

    // Ensure actions that create timer events carry the current timestamp so
    // the reducer's evt() calls produce correct startedAt/pausedAt/resumedAt values.
    const actionWithNow = (action.type === 'PLAY_PAUSE' || action.type === 'SKIP' || action.type === 'SESSION_END')
      ? { ...action, now: (action as { now?: number }).now ?? now }
      : action
    baseDispatch(actionWithNow)
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
