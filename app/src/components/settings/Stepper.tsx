import { useState } from 'react'

interface StepperProps {
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  label: string
  unit?: string
}

export const Stepper = ({ value, min, max, step, onChange, label, unit }: StepperProps) => {
  const [raw, setRaw] = useState<string | null>(null)
  const displayed = raw !== null ? raw : String(value)

  const increment = () => onChange(Math.min(max, round(value + step, step)))
  const decrement = () => onChange(Math.max(min, round(value - step, step)))

  const handleBlur = () => {
    const parsed = parseFloat(displayed)
    const clamped = isNaN(parsed) ? min : Math.min(max, Math.max(min, parsed))
    setRaw(null)
    onChange(clamped)
  }

  return (
    <div className="flex items-center gap-[6px] shrink-0">
      <button
        aria-label={`Decrement ${label}`}
        onClick={decrement}
        disabled={value <= min}
        className="flex items-center justify-center p-0 bg-transparent border-none cursor-pointer w-[18px] h-[18px] text-[15px] text-text-muted disabled:opacity-30 disabled:cursor-default"
        style={{ transition: 'color var(--ease-fast)' }}
      >
        −
      </button>
      <div className="flex items-center justify-center">
        <input
          role="spinbutton"
          aria-label={label}
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          inputMode="numeric"
          value={displayed}
          onChange={e => setRaw(e.target.value)}
          onFocus={e => e.target.select()}
          onBlur={handleBlur}
          className="font-mono font-light text-[12px] text-text-secondary tracking-[0.02em] text-center bg-transparent border-none outline-none"
          style={{ width: 38 }}
        />
        {unit && (
          <span className="font-sans text-[11px] text-text-muted ml-[2px] shrink-0">{unit}</span>
        )}
      </div>
      <button
        aria-label={`Increment ${label}`}
        onClick={increment}
        disabled={value >= max}
        className="flex items-center justify-center p-0 bg-transparent border-none cursor-pointer w-[18px] h-[18px] text-[15px] text-text-muted disabled:opacity-30 disabled:cursor-default"
        style={{ transition: 'color var(--ease-fast)' }}
      >
        +
      </button>
    </div>
  )
}

const round = (n: number, step: number): number => {
  const inv = 1 / step
  return Math.round(n * inv) / inv
}
