import type { TimerState } from '../../types/timer'
import type { Settings } from '../../types/settings'

export function computeFillFraction(state: TimerState, settings: Settings): number {
  if (state.phase === 'idle') return 1

  const isFlowmodoro = settings.mode === 'flowmodoro' && state.sessionType === 'focus'

  if (!isFlowmodoro) {
    return Math.min(1, Math.max(0, state.remainingMs / state.plannedDuration))
  }

  const elapsed = state.plannedDuration - state.remainingMs
  const target = state.plannedDuration

  if (elapsed <= target) {
    return (elapsed / target) * 0.75
  }

  const k = 3
  const overtime = elapsed - target
  return 0.75 + 0.25 * (1 - Math.exp(-k * overtime / target))
}
