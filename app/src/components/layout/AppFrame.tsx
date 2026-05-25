import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  mode?: 'focus' | 'rest'
}

export function AppFrame({ children, mode = 'focus' }: Props) {
  return (
    <div className="app" data-mode={mode}>
      {children}
    </div>
  )
}
