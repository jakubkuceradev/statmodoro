import { useState } from 'react'
import { SettingsProvider } from './contexts/SettingsContext'
import { TimerPhaseProvider, useTimerPhase } from './contexts/TimerPhaseContext'
import { TimerClockProvider } from './contexts/TimerClockContext'
import { AppFrame } from './components/layout/AppFrame'
import { Navbar } from './components/layout/Navbar'
import { TimerScreen } from './components/timer/TimerScreen'
import { StatsScreen } from './components/stats/StatsScreen'
import { SettingsScreen } from './components/settings/SettingsScreen'

type ActiveScreen = 'timer' | 'stats' | 'settings' | 'analysis'

const AppContent = () => {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('timer')
  const { state } = useTimerPhase()

  const mode =
    state.phase === 'break_running' || state.phase === 'break_paused' ? 'rest' : 'focus'

  return (
    <AppFrame mode={mode}>
      {activeScreen === 'timer'    && <TimerScreen />}
      {activeScreen === 'stats'    && <StatsScreen />}
      {activeScreen === 'settings' && <SettingsScreen />}
      <Navbar activeScreen={activeScreen} onNavigate={setActiveScreen} />
    </AppFrame>
  )
}

const App = () => (
  <SettingsProvider>
    <TimerPhaseProvider>
      <TimerClockProvider>
        <AppContent />
      </TimerClockProvider>
    </TimerPhaseProvider>
  </SettingsProvider>
)

export default App
