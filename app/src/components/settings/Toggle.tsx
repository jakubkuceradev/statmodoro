interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

export const Toggle = ({ checked, onChange, label }: ToggleProps) => (
  <button
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className="relative shrink-0 cursor-pointer border p-0"
    style={{
      width: 34,
      height: 19,
      borderRadius: 10,
      background: checked ? 'var(--accent)' : 'var(--color-surface-raised)',
      borderColor: checked ? 'var(--accent)' : 'var(--color-border-strong)',
      transition: 'background var(--ease-med), border-color var(--ease-med)',
    }}
  >
    <span
      aria-hidden="true"
      className="absolute rounded-full"
      style={{
        width: 13,
        height: 13,
        top: 2,
        left: 2,
        background: checked ? 'white' : 'var(--color-text-muted)',
        transform: checked ? 'translateX(15px)' : 'translateX(0)',
        transition: 'transform var(--ease-med), background var(--ease-med)',
      }}
    />
  </button>
)
