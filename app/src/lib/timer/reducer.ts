import type { Settings } from '../../types/settings'
import type { TimerState, TimerAction } from '../../types/timer'

export function reducer(state: TimerState, action: TimerAction, settings: Settings): TimerState {
  switch (action.type) {
    case 'TAP_RING': {
      if (state.phase === 'idle') {
        return {
          ...state,
          phase: 'focus_running',
          sessionType: 'focus',
          loopPosition: 0,
          plannedDuration: settings.focusDuration * 60_000,
          remainingMs: settings.focusDuration * 60_000,
        }
      }
      if (state.phase === 'focus_running') return { ...state, phase: 'focus_paused' }
      if (state.phase === 'focus_paused')  return { ...state, phase: 'focus_running' }
      if (state.phase === 'break_running') return { ...state, phase: 'break_paused' }
      if (state.phase === 'break_paused')  return { ...state, phase: 'break_running' }
      return state
    }

    case 'SKIP': {
      const isFocus = state.phase === 'focus_running' || state.phase === 'focus_paused'

      if (isFocus) {
        const isLastSession = state.loopPosition === settings.sessionsPerLoop - 1
        const sessionType = isLastSession ? 'long_break' : 'short_break'
        const plannedDuration = isLastSession
          ? settings.longBreakDuration * 60_000
          : settings.shortBreakDuration * 60_000
        return {
          ...state,
          phase: settings.autoStartBreaks ? 'break_running' : 'break_paused',
          sessionType,
          plannedDuration,
          remainingMs: plannedDuration,
          loopPosition: isLastSession ? state.loopPosition : state.loopPosition + 1,
        }
      }

      const isLongBreak = state.sessionType === 'long_break'
      const plannedDuration = settings.focusDuration * 60_000
      return {
        ...state,
        phase: settings.autoStartFocus ? 'focus_running' : 'focus_paused',
        sessionType: 'focus',
        plannedDuration,
        remainingMs: plannedDuration,
        loopPosition: isLongBreak ? 0 : state.loopPosition,
      }
    }

    case 'LOOP_RESET':
      return { ...state, loopPosition: 0 }

    case 'SESSION_END': {
      const isFocus = state.phase === 'focus_running' || state.phase === 'focus_paused'

      if (isFocus) {
        const isLastSession = state.loopPosition === settings.sessionsPerLoop - 1
        const sessionType = isLastSession ? 'long_break' : 'short_break'
        const plannedDuration = isLastSession
          ? settings.longBreakDuration * 60_000
          : settings.shortBreakDuration * 60_000
        return {
          ...state,
          phase: settings.autoStartBreaks ? 'break_running' : 'break_paused',
          sessionType,
          plannedDuration,
          remainingMs: plannedDuration,
          loopPosition: isLastSession ? state.loopPosition : state.loopPosition + 1,
        }
      }

      const isLongBreak = state.sessionType === 'long_break'
      const plannedDuration = settings.focusDuration * 60_000
      return {
        ...state,
        phase: settings.autoStartFocus ? 'focus_running' : 'focus_paused',
        sessionType: 'focus',
        plannedDuration,
        remainingMs: plannedDuration,
        loopPosition: isLongBreak ? 0 : state.loopPosition,
      }
    }

    case 'SETTINGS_CHANGED': {
      return {
        ...state,
        loopPosition: Math.min(state.loopPosition, action.settings.sessionsPerLoop - 1),
      }
    }

    case 'RESTORE':
      return action.state

    default:
      return state
  }
}
