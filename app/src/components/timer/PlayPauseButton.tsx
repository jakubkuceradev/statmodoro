import type { TimerPhase } from '../../types/timer'

interface Props {
  phase: TimerPhase
  onPlayPause: () => void
}

const running = (phase: TimerPhase) => phase === 'focus_running' || phase === 'break_running'

export const PlayPauseButton = ({ phase, onPlayPause }: Props) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <button
      aria-label={running(phase) ? 'Pause' : 'Play'}
      onClick={onPlayPause}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
      onMouseEnter={e => { (e.currentTarget.querySelector('svg') as SVGElement).style.opacity = '1' }}
      onMouseLeave={e => { (e.currentTarget.querySelector('svg') as SVGElement).style.opacity = '0.82' }}
    >
      <svg
        width="40" height="40"
        viewBox="0 0 24 24"
        aria-hidden="true"
        style={{ fill: 'var(--accent)', opacity: 0.82, transition: 'opacity var(--ease-med)' }}
      >
        {running(phase) ? (
          <>
            <rect x="5" y="4" width="4" height="16" rx="1.5" />
            <rect x="15" y="4" width="4" height="16" rx="1.5" />
          </>
        ) : (
          <path d="M6 4.5l12 7.5-12 7.5V4.5z" />
        )}
      </svg>
    </button>
  </div>
)
