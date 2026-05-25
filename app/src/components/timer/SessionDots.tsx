import { useState } from 'react'
import type { TimerPhase } from '../../types/timer'

interface Props {
  phase: TimerPhase
  loopPosition: number
  sessionsPerLoop: number
  onReset: () => void
}

export const SessionDots = ({ phase, loopPosition, sessionsPerLoop, onReset }: Props) => {
  const [hovered, setHovered] = useState(false)
  const isIdle = phase === 'idle'

  return (
    <div className="flex flex-col items-center" style={{ gap: '6px' }}>
      <span
        className="font-sans uppercase"
        style={{
          fontSize: '9px',
          letterSpacing: '0.12em',
          color: 'rgba(255,255,255,0.72)',
          whiteSpace: 'nowrap',
          opacity: hovered ? 1 : 0,
          transition: 'opacity var(--ease-fast)',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        Reset Loop
      </span>

      <button
        aria-label="Reset loop"
        onClick={onReset}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '6px 10px',
          borderRadius: 'var(--radius-pill)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {Array.from({ length: sessionsPerLoop }, (_, i) => {
          const isDone   = !isIdle && i < loopPosition
          const isActive = !isIdle && i === loopPosition

          // On hover, all dots dim to the same faint white (matches mock behaviour)
          const bg = hovered
            ? 'rgba(255,255,255,0.14)'
            : isDone
              ? 'var(--accent-dim)'
              : isActive
                ? 'var(--accent)'
                : 'rgba(255,255,255,0.14)'

          return (
            <span
              key={i}
              aria-hidden="true"
              style={{
                display: 'block',
                height: '6px',
                width: isActive ? '22px' : '6px',
                borderRadius: '3px',
                background: bg,
                transition: 'background var(--ease-med), width var(--ease-med)',
              }}
            />
          )
        })}
      </button>
    </div>
  )
}
