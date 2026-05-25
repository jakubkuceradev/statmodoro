interface Props {
  onSkip: () => void
}

export const SkipButton = ({ onSkip }: Props) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <button
      aria-label="Skip"
      onClick={onSkip}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
      onMouseEnter={e => { (e.currentTarget.querySelector('svg') as SVGElement).style.opacity = '1' }}
      onMouseLeave={e => { (e.currentTarget.querySelector('svg') as SVGElement).style.opacity = '0.82' }}
    >
      <svg
        width="28" height="28"
        viewBox="0 0 24 24"
        aria-hidden="true"
        style={{ fill: 'var(--accent)', opacity: 0.82, transition: `opacity var(--ease-med)` }}
      >
        <path d="M5 4l10 8-10 8V4z" />
        <rect x="18" y="4" width="2.5" height="16" rx="1" />
      </svg>
    </button>
  </div>
)
