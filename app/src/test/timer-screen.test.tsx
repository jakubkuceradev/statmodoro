import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

const SETTINGS_KEY = 'statmodoro:settings'

function setSettings(patch: Record<string, unknown>) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(patch))
}

function mmss(minutes: number, seconds = 0): string {
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

beforeEach(() => {
  localStorage.clear()
})

describe('initial state', () => {
  it('shows the configured focus duration as initial time', () => {
    setSettings({ focusDuration: 7 })
    render(<App />)
    expect(screen.getByRole('timer', { name: mmss(7) })).toBeVisible()
  })

  it('shows "Tap to Focus" state label when idle', () => {
    render(<App />)
    expect(screen.getByText('Tap to Focus')).toBeVisible()
  })

  it('ring button is labelled for starting focus when idle', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /start focus/i })).toBeVisible()
  })
})

describe('ring interaction', () => {
  it('tapping the ring starts the timer — label changes to "Focus"', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /start focus/i }))
    expect(screen.getByText('Focus')).toBeVisible()
  })

  it('ring button relabels to "Pause focus" while running', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /start focus/i }))
    expect(screen.getByRole('button', { name: /pause focus/i })).toBeVisible()
  })

  it('tapping again pauses — label reverts to "Tap to Focus"', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await userEvent.click(screen.getByRole('button', { name: /pause focus/i }))
    expect(screen.getByText('Tap to Focus')).toBeVisible()
  })

  it('ring button relabels to "Resume focus" while paused', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await userEvent.click(screen.getByRole('button', { name: /pause focus/i }))
    expect(screen.getByRole('button', { name: /resume focus/i })).toBeVisible()
  })
})

describe('skip button', () => {
  it('is present on the timer screen', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /skip/i })).toBeVisible()
  })

  it('skipping from running focus always starts the break running', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(screen.getByText('Rest')).toBeVisible()
  })

  it('skipping again from break always starts the next focus running', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(screen.getByText('Focus')).toBeVisible()
  })

  it('break time shown after skipping focus matches short break duration', async () => {
    setSettings({ focusDuration: 7, shortBreakDuration: 3 })
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(screen.getByRole('timer', { name: mmss(3) })).toBeVisible()
  })
})

describe('session dots', () => {
  it('loop reset control is present', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /reset loop/i })).toBeVisible()
  })

  it('resetting the loop does not interrupt a running timer', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await userEvent.click(screen.getByRole('button', { name: /reset loop/i }))
    expect(screen.getByText('Focus')).toBeVisible()
  })
})

describe('auto-start settings', () => {
  it('break starts running immediately when auto-start breaks is on', async () => {
    setSettings({ autoStartBreaks: true })
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(screen.getByText('Rest')).toBeVisible()
  })

  it('focus starts running immediately when auto-start focus is on', async () => {
    setSettings({ autoStartFocus: true })
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await userEvent.click(screen.getByRole('button', { name: /skip/i })) // focus → break running
    await userEvent.click(screen.getByRole('button', { name: /skip/i })) // break → focus running
    expect(screen.getByText('Focus')).toBeVisible()
  })
})

describe('loop cycling', () => {
  it('final session of the loop triggers the long break', async () => {
    setSettings({ sessionsPerLoop: 2, shortBreakDuration: 3, longBreakDuration: 8 })
    render(<App />)
    // Session 1: focus → skip → short break → skip
    await userEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    await userEvent.click(screen.getByRole('button', { name: /skip/i })) // skip short break
    // Session 2 (last): skip → should get long break
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(screen.getByRole('timer', { name: mmss(8) })).toBeVisible()
  })

  it('loop resets to focus after the long break is skipped', async () => {
    setSettings({ sessionsPerLoop: 2 })
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await userEvent.click(screen.getByRole('button', { name: /skip/i })) // → short break
    await userEvent.click(screen.getByRole('button', { name: /skip/i })) // → session 2 focus
    await userEvent.click(screen.getByRole('button', { name: /skip/i })) // → long break
    await userEvent.click(screen.getByRole('button', { name: /skip/i })) // → session 1 focus (running)
    expect(screen.getByText('Focus')).toBeVisible()
  })
})

describe('accent mode', () => {
  it('app enters rest mode when a break starts', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(document.querySelector('[data-mode="rest"]')).toBeInTheDocument()
  })

  it('app returns to focus mode when break is skipped', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(document.querySelector('[data-mode="focus"]')).toBeInTheDocument()
  })
})
