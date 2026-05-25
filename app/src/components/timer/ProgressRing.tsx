import { useState } from 'react'
import type { TimerPhase } from '../../types/timer'

const RADIUS = 102
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const ringLabel = (phase: TimerPhase): string => {
  switch (phase) {
    case 'idle':          return 'Start focus session'
    case 'focus_running': return 'Pause focus'
    case 'focus_paused':  return 'Resume focus'
    case 'break_running': return 'Pause break'
    case 'break_paused':  return 'Resume break'
  }
}

interface Props {
  phase: TimerPhase
  fillFraction: number
  timeDisplay: [string, string]  // [minutes, seconds]
  stateLabel: string
  onTap: () => void
}

export const ProgressRing = ({ phase, fillFraction, timeDisplay, stateLabel, onTap }: Props) => {
  const [hovered, setHovered] = useState(false)

  const isRunning = phase === 'focus_running' || phase === 'break_running'
  const isPaused  = phase === 'focus_paused'  || phase === 'break_paused'

  const stroke = hovered
    ? 'var(--accent-mid)'
    : isRunning ? 'var(--accent)' : 'var(--accent-dim)'

  const timeColor = hovered
    ? 'var(--color-text-hover)'
    : isPaused ? 'var(--color-text-paused)' : 'var(--color-text-primary)'

  const dashLength = Math.max(0, fillFraction * CIRCUMFERENCE)
  const [mins, secs] = timeDisplay

  const handleTap = () => { setHovered(false); onTap() }

  return (
    <button
      aria-label={ringLabel(phase)}
      onClick={handleTap}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      className="relative w-[220px] h-[220px] rounded-full flex items-center justify-center flex-shrink-0"
    >
      <svg
        width="220" height="220"
        viewBox="0 0 220 220"
        aria-hidden="true"
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx="110" cy="110" r={RADIUS}
          fill="none"
          style={{ stroke: 'var(--color-ring-track)', strokeWidth: 5 }}
        />
        <circle
          cx="110" cy="110" r={RADIUS}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dashLength} ${CIRCUMFERENCE}`}
          style={{
            stroke,
            strokeWidth: 5,
            transition: 'stroke var(--ease-color)',
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ gap: '7px' }}>
        <div
          role="timer"
          aria-label={`${mins}:${secs}`}
          className="font-mono leading-none"
          style={{
            fontSize: '46px',
            fontWeight: 300,
            letterSpacing: '-0.02em',
            color: timeColor,
            transition: 'color var(--ease-color)',
            display: 'flex',
            alignItems: 'baseline',
          }}
        >
          <span aria-hidden="true">{mins}</span>
          <span aria-hidden="true" style={{ fontWeight: 100, opacity: 0.55, fontSize: '40px', margin: '0 1px' }}>:</span>
          <span aria-hidden="true">{secs}</span>
        </div>
        <span
          className="font-sans uppercase"
          style={{
            fontSize: '10px',
            fontWeight: 500,
            letterSpacing: '0.24em',
            color: 'var(--accent)',
            transition: 'color var(--ease-color)',
          }}
        >
          {stateLabel}
        </span>
      </div>
    </button>
  )
}
