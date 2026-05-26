import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { SETTINGS_KEY } from '../contexts/SettingsContext'

vi.mock('../lib/audio/index', () => ({
  audioManager: {
    play: vi.fn(),
    setVolume: vi.fn(),
    load: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('../lib/notifications/index', () => ({
  notify: vi.fn(),
  isGranted: vi.fn(() => true),
  requestPermission: vi.fn().mockResolvedValue(true),
}))

import { audioManager } from '../lib/audio/index'
import { notify, isGranted, requestPermission } from '../lib/notifications/index'

function setSettings(patch: Record<string, unknown>) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(patch))
}

async function openSettings() {
  await userEvent.click(screen.getByRole('button', { name: /settings/i }))
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  vi.mocked(isGranted).mockReturnValue(true)
})

describe('sound alerts', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('plays sound when focus session expires naturally with sound alerts on', async () => {
    setSettings({ soundAlertsEnabled: true, focusDuration: 1 })
    vi.useFakeTimers()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await act(async () => { vi.advanceTimersByTime(61_000) })
    expect(audioManager.play).toHaveBeenCalled()
  })

  it('plays sound when break expires naturally with sound alerts on', async () => {
    setSettings({ soundAlertsEnabled: true, focusDuration: 1, shortBreakDuration: 1, autoStartBreaks: true })
    vi.useFakeTimers()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start focus/i }))
    // Let focus expire → break auto-starts running
    await act(async () => { vi.advanceTimersByTime(61_000) })
    vi.mocked(audioManager.play).mockClear()
    // Let break expire → focus starts
    await act(async () => { vi.advanceTimersByTime(61_000) })
    expect(audioManager.play).toHaveBeenCalled()
  })

  it('does not play sound when user skips focus to break', async () => {
    setSettings({ soundAlertsEnabled: true })
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(audioManager.play).not.toHaveBeenCalled()
  })

  it('does not play sound when user skips break to focus', async () => {
    setSettings({ soundAlertsEnabled: true })
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(audioManager.play).not.toHaveBeenCalled()
  })

  it('does not play sound when session expires naturally with sound alerts off', async () => {
    setSettings({ soundAlertsEnabled: false, focusDuration: 1 })
    vi.useFakeTimers()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await act(async () => { vi.advanceTimersByTime(61_000) })
    expect(audioManager.play).not.toHaveBeenCalled()
  })

  it('does not play sound on the initial play from idle', async () => {
    setSettings({ soundAlertsEnabled: true })
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /start focus/i }))
    expect(audioManager.play).not.toHaveBeenCalled()
  })
})

describe('volume initialisation', () => {
  it('applies the current volume setting to audioManager on mount', () => {
    setSettings({ volume: 0.5 })
    render(<App />)
    expect(audioManager.setVolume).toHaveBeenCalledWith(0.5)
  })

  it('updates audioManager volume when the volume slider changes', async () => {
    setSettings({ volume: 0.7 })
    render(<App />)
    await openSettings()
    const slider = screen.getByRole('slider', { name: /volume/i })
    await userEvent.type(slider, '{arrowleft}')
    expect(audioManager.setVolume).toHaveBeenCalledWith(expect.any(Number))
  })
})

describe('desktop notifications', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('fires a notification when focus expires naturally', async () => {
    setSettings({ desktopNotificationsEnabled: true, focusDuration: 1 })
    vi.useFakeTimers()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await act(async () => { vi.advanceTimersByTime(61_000) })
    expect(notify).toHaveBeenCalled()
  })

  it('notification body is "Time to rest!" when focus expires naturally', async () => {
    setSettings({ desktopNotificationsEnabled: true, focusDuration: 1 })
    vi.useFakeTimers()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await act(async () => { vi.advanceTimersByTime(61_000) })
    expect(notify).toHaveBeenCalledWith('Statmodoro', 'Time to rest!')
  })

  it('fires a notification when break expires naturally', async () => {
    setSettings({ desktopNotificationsEnabled: true, focusDuration: 1, shortBreakDuration: 1, autoStartBreaks: true })
    vi.useFakeTimers()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await act(async () => { vi.advanceTimersByTime(61_000) })
    vi.mocked(notify).mockClear()
    await act(async () => { vi.advanceTimersByTime(61_000) })
    expect(notify).toHaveBeenCalled()
  })

  it('notification body is "Back to focus!" when break expires naturally', async () => {
    setSettings({ desktopNotificationsEnabled: true, focusDuration: 1, shortBreakDuration: 1, autoStartBreaks: true })
    vi.useFakeTimers()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await act(async () => { vi.advanceTimersByTime(61_000) })
    vi.mocked(notify).mockClear()
    await act(async () => { vi.advanceTimersByTime(61_000) })
    expect(notify).toHaveBeenCalledWith('Statmodoro', 'Back to focus!')
  })

  it('does not fire when user skips focus to break', async () => {
    setSettings({ desktopNotificationsEnabled: true })
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(notify).not.toHaveBeenCalled()
  })

  it('does not fire when user skips break to focus', async () => {
    setSettings({ desktopNotificationsEnabled: true })
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(notify).not.toHaveBeenCalled()
  })

  it('does not fire on the initial play from idle', async () => {
    setSettings({ desktopNotificationsEnabled: true })
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /start focus/i }))
    expect(notify).not.toHaveBeenCalled()
  })

  it('does not fire when desktop notifications is off', async () => {
    setSettings({ desktopNotificationsEnabled: false, focusDuration: 1 })
    vi.useFakeTimers()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await act(async () => { vi.advanceTimersByTime(61_000) })
    expect(notify).not.toHaveBeenCalled()
  })

  it('does not fire when permission is not granted', async () => {
    vi.mocked(isGranted).mockReturnValue(false)
    setSettings({ desktopNotificationsEnabled: true, focusDuration: 1 })
    vi.useFakeTimers()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start focus/i }))
    await act(async () => { vi.advanceTimersByTime(61_000) })
    expect(notify).not.toHaveBeenCalled()
  })
})

describe('permission request flow', () => {
  it('enabling Desktop Notifications requests browser permission', async () => {
    render(<App />)
    await openSettings()
    await userEvent.click(screen.getByRole('switch', { name: /desktop notifications/i }))
    expect(requestPermission).toHaveBeenCalledOnce()
  })

  it('toggle stays ON when permission is granted', async () => {
    vi.mocked(requestPermission).mockResolvedValue(true)
    render(<App />)
    await openSettings()
    await userEvent.click(screen.getByRole('switch', { name: /desktop notifications/i }))
    await waitFor(() => {
      expect(screen.getByRole('switch', { name: /desktop notifications/i })).toHaveAttribute('aria-checked', 'true')
    })
  })

  it('toggle reverts to OFF when permission is denied', async () => {
    vi.mocked(requestPermission).mockResolvedValue(false)
    render(<App />)
    await openSettings()
    await userEvent.click(screen.getByRole('switch', { name: /desktop notifications/i }))
    await waitFor(() => {
      expect(screen.getByRole('switch', { name: /desktop notifications/i })).toHaveAttribute('aria-checked', 'false')
    })
  })

  it('does not request permission when turning an already-enabled toggle OFF', async () => {
    setSettings({ desktopNotificationsEnabled: true })
    vi.mocked(isGranted).mockReturnValue(true)
    render(<App />)
    await openSettings()
    await userEvent.click(screen.getByRole('switch', { name: /desktop notifications/i }))
    expect(requestPermission).not.toHaveBeenCalled()
  })

  it('requests permission on mount when setting is ON but permission not yet granted', async () => {
    setSettings({ desktopNotificationsEnabled: true })
    vi.mocked(isGranted).mockReturnValue(false)
    render(<App />)
    await waitFor(() => {
      expect(requestPermission).toHaveBeenCalledOnce()
    })
  })

  it('reverts toggle to OFF on mount when setting is ON but permission is denied', async () => {
    setSettings({ desktopNotificationsEnabled: true })
    vi.mocked(isGranted).mockReturnValue(false)
    vi.mocked(requestPermission).mockResolvedValue(false)
    render(<App />)
    await waitFor(() => { expect(requestPermission).toHaveBeenCalled() })
    await openSettings()
    expect(screen.getByRole('switch', { name: /desktop notifications/i })).toHaveAttribute('aria-checked', 'false')
  })

  it('does not request permission on mount when setting is ON and permission is already granted', async () => {
    setSettings({ desktopNotificationsEnabled: true })
    vi.mocked(isGranted).mockReturnValue(true)
    render(<App />)
    await waitFor(() => {})
    expect(requestPermission).not.toHaveBeenCalled()
  })
})
