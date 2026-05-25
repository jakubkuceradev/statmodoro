import type { ReactNode } from 'react'

interface Props {
  label: string
  children: ReactNode
}

export function Screen({ label, children }: Props) {
  return (
    <>
      <section className="screen" aria-label={label}>
        {children}
      </section>
      <div className="screen-fade" aria-hidden="true" />
    </>
  )
}
