import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { SETTINGS_KEY } from '../contexts/SettingsContext'

function setSettings(patch: Record<string, unknown>) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(patch))
}

async function openSettings() {
  render(<App />)
  await userEvent.click(screen.getByRole('button', { name: /settings/i }))
}

beforeEach(() => {
  localStorage.clear()
})

describe('settings groups', () => {
  it('renders the Timer group heading', async () => {
    await openSettings()
    expect(screen.getByRole('heading', { name: /^timer$/i })).toBeVisible()
  })

  it('renders the Behaviour group heading', async () => {
    await openSettings()
    expect(screen.getByText(/^behaviour$/i)).toBeVisible()
  })

  it('renders the Notifications group heading', async () => {
    await openSettings()
    expect(screen.getByText(/^notifications$/i)).toBeVisible()
  })

  it('renders the Data group heading', async () => {
    await openSettings()
    expect(screen.getByText(/^data$/i)).toBeVisible()
  })
})

describe('stepper settings', () => {
  it('Focus Duration stepper shows the default value', async () => {
    await openSettings()
    expect(screen.getByRole('spinbutton', { name: /focus duration/i })).toHaveValue('25')
  })

  it('Focus Duration stepper shows value from localStorage', async () => {
    setSettings({ focusDuration: 45 })
    await openSettings()
    expect(screen.getByRole('spinbutton', { name: /focus duration/i })).toHaveValue('45')
  })

  it('incrementing Focus Duration updates the timer display on the Timer screen', async () => {
    setSettings({ focusDuration: 25 })
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /settings/i }))
    await userEvent.click(screen.getByRole('button', { name: /increment focus duration/i }))
    await userEvent.click(screen.getByRole('button', { name: /timer/i }))
    expect(screen.getByRole('timer', { name: '26:00' })).toBeVisible()
  })

  it('changing Focus Duration persists to localStorage', async () => {
    await openSettings()
    await userEvent.click(screen.getByRole('button', { name: /increment focus duration/i }))
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY)!)
    expect(stored.focusDuration).toBe(26)
  })
})

describe('mode selector', () => {
  it('Flowmodoro Break Ratio row is hidden in Pomodoro mode', async () => {
    await openSettings()
    expect(screen.queryByRole('spinbutton', { name: /break ratio/i })).not.toBeInTheDocument()
  })

  it('Flowmodoro Break Ratio row appears after switching to Flowmodoro', async () => {
    await openSettings()
    await userEvent.click(screen.getByRole('switch', { name: /flowmodoro/i }))
    expect(screen.getByRole('spinbutton', { name: /break ratio/i })).toBeVisible()
  })

  it('switching back to Pomodoro hides the Break Ratio row again', async () => {
    await openSettings()
    await userEvent.click(screen.getByRole('switch', { name: /flowmodoro/i }))
    await userEvent.click(screen.getByRole('switch', { name: /flowmodoro/i }))
    expect(screen.queryByRole('spinbutton', { name: /break ratio/i })).not.toBeInTheDocument()
  })

  it('mode defaults to Pomodoro (Flowmodoro toggle is off)', async () => {
    await openSettings()
    expect(screen.getByRole('switch', { name: /flowmodoro/i })).toHaveAttribute('aria-checked', 'false')
  })
})

describe('toggles', () => {
  it('Auto-Start Breaks is off by default', async () => {
    await openSettings()
    expect(screen.getByRole('switch', { name: /auto-start breaks/i })).toHaveAttribute('aria-checked', 'false')
  })

  it('clicking Auto-Start Breaks turns it on', async () => {
    await openSettings()
    await userEvent.click(screen.getByRole('switch', { name: /auto-start breaks/i }))
    expect(screen.getByRole('switch', { name: /auto-start breaks/i })).toHaveAttribute('aria-checked', 'true')
  })

  it('clicking Auto-Start Breaks again turns it back off', async () => {
    await openSettings()
    await userEvent.click(screen.getByRole('switch', { name: /auto-start breaks/i }))
    await userEvent.click(screen.getByRole('switch', { name: /auto-start breaks/i }))
    expect(screen.getByRole('switch', { name: /auto-start breaks/i })).toHaveAttribute('aria-checked', 'false')
  })

  it('Auto-Start Focus is off by default', async () => {
    await openSettings()
    expect(screen.getByRole('switch', { name: /auto-start focus/i })).toHaveAttribute('aria-checked', 'false')
  })

  it('Sound Alerts is on by default', async () => {
    await openSettings()
    expect(screen.getByRole('switch', { name: /sound alerts/i })).toHaveAttribute('aria-checked', 'true')
  })

  it('Desktop Notifications is off by default', async () => {
    await openSettings()
    expect(screen.getByRole('switch', { name: /desktop notifications/i })).toHaveAttribute('aria-checked', 'false')
  })

  it('toggle state persists to localStorage', async () => {
    await openSettings()
    await userEvent.click(screen.getByRole('switch', { name: /auto-start breaks/i }))
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY)!)
    expect(stored.autoStartBreaks).toBe(true)
  })
})

describe('volume slider', () => {
  it('Volume renders as a slider', async () => {
    await openSettings()
    expect(screen.getByRole('slider', { name: /volume/i })).toBeVisible()
  })
})

describe('data group', () => {
  it('Import Data action is present', async () => {
    await openSettings()
    expect(screen.getByRole('button', { name: /import data/i })).toBeVisible()
  })

  it('Export Data action is present', async () => {
    await openSettings()
    expect(screen.getByRole('button', { name: /export data/i })).toBeVisible()
  })

  it('Clear All History action is present', async () => {
    await openSettings()
    expect(screen.getByRole('button', { name: /clear all history/i })).toBeVisible()
  })

  it('Reset All Settings action is present', async () => {
    await openSettings()
    expect(screen.getByRole('button', { name: /reset all settings/i })).toBeVisible()
  })
})

describe('settings persistence', () => {
  it('settings loaded from localStorage on mount', async () => {
    setSettings({ focusDuration: 50, autoStartBreaks: true })
    await openSettings()
    expect(screen.getByRole('spinbutton', { name: /focus duration/i })).toHaveValue('50')
    expect(screen.getByRole('switch', { name: /auto-start breaks/i })).toHaveAttribute('aria-checked', 'true')
  })
})

describe('settings changes do not interrupt a running timer', () => {
  it('timer stays running after focus duration is changed from Settings', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await userEvent.click(screen.getByRole('button', { name: /settings/i }))
    await userEvent.click(screen.getByRole('button', { name: /increment focus duration/i }))
    await userEvent.click(screen.getByRole('button', { name: /timer/i }))
    expect(screen.getByText('Focus')).toBeVisible()
  })
})

describe('break duration reflects settings at the moment of skip', () => {
  it('changing short break duration from Settings is reflected on the next break', async () => {
    setSettings({ focusDuration: 7, shortBreakDuration: 3 })
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /settings/i }))
    await userEvent.click(screen.getByRole('button', { name: /increment short break/i }))
    await userEvent.click(screen.getByRole('button', { name: /timer/i }))
    await userEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(screen.getByRole('timer', { name: '04:00' })).toBeVisible()
  })
})
