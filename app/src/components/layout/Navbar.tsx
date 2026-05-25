type ActiveScreen = 'timer' | 'stats' | 'settings' | 'analysis'

interface Props {
  activeScreen: ActiveScreen
  onNavigate: (screen: ActiveScreen) => void
}

const ICON_SIZE = 20
const ICON_BASE = {
  width: ICON_SIZE,
  height: ICON_SIZE,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  'aria-hidden': true as const,
}

function TimerIcon() {
  return (
    <svg {...ICON_BASE} viewBox="0 0 20 20" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.5" />
      <polyline points="10,5.5 10,10 13,12" />
    </svg>
  )
}

function StatsIcon() {
  return (
    <svg {...ICON_BASE} viewBox="0 0 20 20">
      <line x1="4" y1="16" x2="4" y2="11" />
      <line x1="10" y1="16" x2="10" y2="6" />
      <line x1="16" y1="16" x2="16" y2="9" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg {...ICON_BASE} viewBox="0 0 24 24" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

const TABS = [
  { id: 'timer' as const,    label: 'Timer',    Icon: TimerIcon },
  { id: 'stats' as const,    label: 'Stats',    Icon: StatsIcon },
  { id: 'settings' as const, label: 'Settings', Icon: SettingsIcon },
]

export function Navbar({ activeScreen, onNavigate }: Props) {
  return (
    <nav className="navbar">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className="nav-tab"
          data-active={activeScreen === id ? 'true' : undefined}
          onClick={() => onNavigate(id)}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
