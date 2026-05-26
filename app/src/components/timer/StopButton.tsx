interface Props {
  onStop: () => void
}

export const StopButton = ({ onStop }: Props) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <button
      aria-label="Stop"
      onClick={onStop}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
      onMouseEnter={e => { (e.currentTarget.querySelector('svg') as SVGElement).style.opacity = '1' }}
      onMouseLeave={e => { (e.currentTarget.querySelector('svg') as SVGElement).style.opacity = '0.45' }}
    >
      <svg
        width="26" height="26"
        viewBox="0 0 24 24"
        aria-hidden="true"
        style={{ fill: 'var(--accent)', opacity: 0.45, transition: 'opacity var(--ease-med)' }}
      >
        <rect x="5" y="5" width="14" height="14" rx="1.5" />
      </svg>
    </button>
  </div>
)
