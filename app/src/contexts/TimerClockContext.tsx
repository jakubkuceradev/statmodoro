import { createContext, useContext, useState, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useTimerPhase } from './TimerPhaseContext'

interface TimerClockContextValue {
  remainingMs: number
}

const TimerClockContext = createContext<TimerClockContextValue | null>(null)

export const TimerClockProvider = ({ children }: { children: ReactNode }) => {
  const { state, endTimestamp, dispatch } = useTimerPhase()

  const isRunning = state.phase === 'focus_running' || state.phase === 'break_running'

  const [remainingMs, setRemainingMs] = useState<number>(() =>
    endTimestamp !== null ? Math.max(0, endTimestamp - Date.now()) : state.remainingMs,
  )

  // When not running, keep the display in sync with the reducer's remainingMs
  // (covers paused state, new session after skip, settings changes)
  useEffect(() => {
    if (!isRunning) setRemainingMs(state.remainingMs)
  }, [isRunning, state.remainingMs])

  // Running interval: derive remaining from endTimestamp and fire SESSION_END at zero
  const prevRemainingRef = useRef(Infinity)
  useEffect(() => {
    if (!isRunning) return

    prevRemainingRef.current = Infinity

    const id = setInterval(() => {
      if (endTimestamp === null) return
      const remaining = Math.max(0, endTimestamp - Date.now())
      setRemainingMs(remaining)
      if (remaining === 0 && prevRemainingRef.current > 0) {
        dispatch({ type: 'SESSION_END' })
      }
      prevRemainingRef.current = remaining
    }, 100)

    return () => clearInterval(id)
  }, [isRunning, endTimestamp, dispatch])

  return (
    <TimerClockContext.Provider value={{ remainingMs }}>
      {children}
    </TimerClockContext.Provider>
  )
}

export const useTimerClock = () => {
  const ctx = useContext(TimerClockContext)
  if (!ctx) throw new Error('useTimerClock must be inside TimerClockProvider')
  return ctx
}
