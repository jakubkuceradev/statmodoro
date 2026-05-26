import type { TimerPhase } from '../../types/timer'
import { useTimerPhase } from '../../contexts/TimerPhaseContext'
import { useTimerClock } from '../../contexts/TimerClockContext'
import { useSettings } from '../../contexts/SettingsContext'
import { computeFillFraction } from '../../lib/timer/fillFraction'
import { ProgressRing } from './ProgressRing'
import { SessionDots } from './SessionDots'
import { SkipButton } from './SkipButton'
import { StopButton } from './StopButton'
import { PlayPauseButton } from './PlayPauseButton'

const stateLabel = (phase: TimerPhase): string => {
  switch (phase) {
    case 'idle':          return 'Tap to Focus'
    case 'focus_running': return 'Focus'
    case 'focus_paused':  return 'Tap to Focus'
    case 'break_running': return 'Rest'
    case 'break_paused':  return 'Tap to Rest'
  }
}

const splitMs = (ms: number): [string, string] => {
  const totalSecs = Math.ceil(ms / 1000)
  const m = Math.floor(totalSecs / 60)
  const s = totalSecs % 60
  return [String(m).padStart(2, '0'), String(s).padStart(2, '0')]
}

export const TimerScreen = () => {
  const { state, dispatch } = useTimerPhase()
  const { remainingMs } = useTimerClock()
  const { settings } = useSettings()

  const fillFraction = computeFillFraction({ ...state, remainingMs }, settings)

  return (
    <section className="timer-screen" aria-label="Timer">
      <SessionDots
        phase={state.phase}
        loopPosition={state.loopPosition}
        sessionsPerLoop={settings.sessionsPerLoop}
        onReset={() => dispatch({ type: 'LOOP_RESET' })}
      />

      <ProgressRing
        phase={state.phase}
        fillFraction={fillFraction}
        timeDisplay={splitMs(remainingMs)}
        stateLabel={stateLabel(state.phase)}
        onTap={() => dispatch({ type: 'TAP_RING' })}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
        <StopButton onStop={() => dispatch({ type: 'STOP' })} />
        <PlayPauseButton phase={state.phase} onPlayPause={() => dispatch({ type: 'TAP_RING' })} />
        <SkipButton onSkip={() => dispatch({ type: 'SKIP' })} />
      </div>
    </section>
  )
}
