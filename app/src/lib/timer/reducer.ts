import type { Settings } from '../../types/settings'
import type { TimerState, TimerAction, TimerEvent } from '../../types/timer'

const newId = (provided?: string) => provided ?? crypto.randomUUID()
const evt = (type: TimerEvent['type'], now?: number): TimerEvent => ({ type, timestamp: now ?? 0 })

export function reducer(state: TimerState, action: TimerAction, settings: Settings): TimerState {
  switch (action.type) {
    case 'PLAY_PAUSE': {
      if (state.phase === 'idle') {
        const id = newId(action.sessionId)
        return {
          ...state,
          phase: 'focus_running',
          sessionType: 'focus',
          plannedDuration: settings.focusDuration * 60_000,
          remainingMs: settings.focusDuration * 60_000,
          currentSessionId: id,
          currentSessionEvents: [evt('start', action.now)],
        }
      }
      if (state.phase === 'focus_running') {
        return { ...state, phase: 'focus_paused', currentSessionEvents: [...state.currentSessionEvents, evt('pause', action.now)] }
      }
      if (state.phase === 'focus_paused') {
        const isFirstPlay = state.currentSessionEvents.length === 0
        return {
          ...state,
          phase: 'focus_running',
          currentSessionId: isFirstPlay ? newId(action.sessionId) : state.currentSessionId,
          currentSessionEvents: isFirstPlay
            ? [evt('start', action.now)]
            : [...state.currentSessionEvents, evt('resume', action.now)],
        }
      }
      if (state.phase === 'break_running') {
        return { ...state, phase: 'break_paused', currentSessionEvents: [...state.currentSessionEvents, evt('pause', action.now)] }
      }
      if (state.phase === 'break_paused') {
        const isFirstPlay = state.currentSessionEvents.length === 0
        return {
          ...state,
          phase: 'break_running',
          currentSessionId: isFirstPlay ? newId(action.sessionId) : state.currentSessionId,
          currentSessionEvents: isFirstPlay
            ? [evt('start', action.now)]
            : [...state.currentSessionEvents, evt('resume', action.now)],
        }
      }
      return state
    }

    case 'SKIP': {
      if (state.phase === 'idle') {
        const id = newId(action.sessionId)
        return {
          ...state,
          phase: 'focus_running',
          sessionType: 'focus',
          plannedDuration: settings.focusDuration * 60_000,
          remainingMs: settings.focusDuration * 60_000,
          currentSessionId: id,
          currentSessionEvents: [evt('start', action.now)],
        }
      }

      const isFocus = state.phase === 'focus_running' || state.phase === 'focus_paused'

      if (isFocus) {
        const isLastSession = state.loopPosition === settings.sessionsPerLoop - 1
        const sessionType = isLastSession ? 'long_break' : 'short_break'
        const plannedDuration = isLastSession
          ? settings.longBreakDuration * 60_000
          : settings.shortBreakDuration * 60_000
        const breakId = newId(action.sessionId)
        return {
          ...state,
          phase: 'break_running',
          sessionType,
          plannedDuration,
          remainingMs: plannedDuration,
          loopPosition: state.loopPosition,
          currentSessionId: breakId,
          currentSessionEvents: [evt('start', action.now)],
        }
      }

      const isLongBreak = state.sessionType === 'long_break'
      const plannedDuration = settings.focusDuration * 60_000
      const focusId = newId(action.sessionId)
      return {
        ...state,
        phase: 'focus_running',
        sessionType: 'focus',
        plannedDuration,
        remainingMs: plannedDuration,
        loopPosition: isLongBreak ? 0 : state.loopPosition + 1,
        currentSessionId: focusId,
        currentSessionEvents: [evt('start', action.now)],
      }
    }

    case 'LOOP_RESET':
      return { ...state, loopPosition: 0 }

    case 'STOP': {
      const isPaused = state.phase === 'focus_paused' || state.phase === 'break_paused'
      const alreadyReset = state.phase === 'idle' || (isPaused && state.remainingMs >= state.plannedDuration)
      if (alreadyReset) {
        const focusDuration = settings.focusDuration * 60_000
        return {
          ...state,
          phase: 'idle',
          loopPosition: 0,
          sessionType: 'focus',
          plannedDuration: focusDuration,
          remainingMs: focusDuration,
          currentSessionEvents: [],
          currentSessionId: null,
        }
      }
      const pausedPhase = state.phase === 'focus_running' || state.phase === 'focus_paused'
        ? 'focus_paused'
        : 'break_paused'
      return {
        ...state,
        phase: pausedPhase,
        remainingMs: state.plannedDuration,
        currentSessionEvents: [],
        currentSessionId: null,
      }
    }

    case 'SESSION_END': {
      const isFocus = state.phase === 'focus_running' || state.phase === 'focus_paused'

      if (isFocus) {
        const isLastSession = state.loopPosition === settings.sessionsPerLoop - 1
        const sessionType = isLastSession ? 'long_break' : 'short_break'
        const plannedDuration = isLastSession
          ? settings.longBreakDuration * 60_000
          : settings.shortBreakDuration * 60_000
        const autoStart = settings.autoStartBreaks
        const breakId = autoStart ? newId(action.sessionId) : null
        return {
          ...state,
          phase: autoStart ? 'break_running' : 'break_paused',
          sessionType,
          plannedDuration,
          remainingMs: plannedDuration,
          loopPosition: state.loopPosition,
          currentSessionId: breakId,
          currentSessionEvents: autoStart ? [evt('start', action.now)] : [],
        }
      }

      const isLongBreak = state.sessionType === 'long_break'
      const plannedDuration = settings.focusDuration * 60_000
      const autoStart = settings.autoStartFocus
      const focusId = autoStart ? newId(action.sessionId) : null
      return {
        ...state,
        phase: autoStart ? 'focus_running' : 'focus_paused',
        sessionType: 'focus',
        plannedDuration,
        remainingMs: plannedDuration,
        loopPosition: isLongBreak ? 0 : state.loopPosition + 1,
        currentSessionId: focusId,
        currentSessionEvents: autoStart ? [evt('start', action.now)] : [],
      }
    }

    case 'SETTINGS_CHANGED': {
      const clampedLoop = Math.min(state.loopPosition, action.settings.sessionsPerLoop - 1)
      if (state.phase === 'idle') {
        const focusDuration = action.settings.focusDuration * 60_000
        return {
          ...state,
          loopPosition: clampedLoop,
          plannedDuration: focusDuration,
          remainingMs: focusDuration,
        }
      }
      return { ...state, loopPosition: clampedLoop }
    }

    case 'RESTORE':
      return action.state

    default:
      return state
  }
}
