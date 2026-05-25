import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

describe('screen navigation', () => {
  it('shows the Timer screen on initial load', () => {
    render(<App />)
    expect(screen.getByRole('region', { name: /timer/i })).toBeVisible()
  })

  it('shows the Stats screen when the Stats tab is clicked', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /stats/i }))
    expect(screen.getByRole('region', { name: /stats/i })).toBeVisible()
  })

  it('shows the Settings screen when the Settings tab is clicked', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /settings/i }))
    expect(screen.getByRole('region', { name: /settings/i })).toBeVisible()
  })

  it('returns to the Timer screen when the Timer tab is clicked from another screen', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /stats/i }))
    await userEvent.click(screen.getByRole('button', { name: /timer/i }))
    expect(screen.getByRole('region', { name: /timer/i })).toBeVisible()
  })

  it('shows exactly one screen at a time', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /stats/i }))
    expect(screen.getAllByRole('region').filter(el => el.style.display !== 'none')).toHaveLength(1)
  })
})
