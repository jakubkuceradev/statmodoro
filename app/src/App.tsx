import { useState } from 'react'
import { AppFrame } from './components/layout/AppFrame'
import { Navbar } from './components/layout/Navbar'
import { TimerScreen } from './components/timer/TimerScreen'
import { StatsScreen } from './components/stats/StatsScreen'
import { SettingsScreen } from './components/settings/SettingsScreen'

type ActiveScreen = 'timer' | 'stats' | 'settings' | 'analysis'

function App() {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('timer')

  return (
    <AppFrame>
      {activeScreen === 'timer'    && <TimerScreen />}
      {activeScreen === 'stats'    && <StatsScreen />}
      {activeScreen === 'settings' && <SettingsScreen />}
      <Navbar activeScreen={activeScreen} onNavigate={setActiveScreen} />
    </AppFrame>
  )
}

export default App
