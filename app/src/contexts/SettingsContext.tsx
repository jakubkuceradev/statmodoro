import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { Settings } from '../types/settings'
import { DEFAULT_SETTINGS } from '../lib/settings/defaults'

interface SettingsContextValue {
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export const SETTINGS_KEY = 'statmodoro:settings'

// Falls back to defaults when localStorage is unavailable or contains invalid JSON.
const loadSettings = (): Settings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {}
  return DEFAULT_SETTINGS
}

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  const updateSettings = (patch: Partial<Settings>) =>
    setSettings(s => ({ ...s, ...patch }))

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be inside SettingsProvider')
  return ctx
}
