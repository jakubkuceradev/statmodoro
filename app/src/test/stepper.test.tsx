import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { Stepper } from '../components/settings/Stepper'

describe('Stepper', () => {
  it('clicking + calls onChange with value incremented by step', async () => {
    const onChange = vi.fn()
    render(<Stepper value={25} min={1} max={999} step={1} onChange={onChange} label="Focus Duration" />)
    await userEvent.click(screen.getByRole('button', { name: /increment focus duration/i }))
    expect(onChange).toHaveBeenCalledWith(26)
  })

  it('clicking − calls onChange with value decremented by step', async () => {
    const onChange = vi.fn()
    render(<Stepper value={25} min={1} max={999} step={1} onChange={onChange} label="Focus Duration" />)
    await userEvent.click(screen.getByRole('button', { name: /decrement focus duration/i }))
    expect(onChange).toHaveBeenCalledWith(24)
  })

  it('typing a value in the input calls onChange on blur', async () => {
    const onChange = vi.fn()
    render(<Stepper value={25} min={1} max={999} step={1} onChange={onChange} label="Focus Duration" />)
    const input = screen.getByRole('spinbutton', { name: /focus duration/i })
    await userEvent.clear(input)
    await userEvent.type(input, '45')
    await userEvent.tab()
    expect(onChange).toHaveBeenCalledWith(45)
  })

  it('clamps value to min on blur when below min', async () => {
    const onChange = vi.fn()
    render(<Stepper value={25} min={1} max={999} step={1} onChange={onChange} label="Focus Duration" />)
    const input = screen.getByRole('spinbutton', { name: /focus duration/i })
    await userEvent.clear(input)
    await userEvent.type(input, '0')
    await userEvent.tab()
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('clamps value to max on blur when above max', async () => {
    const onChange = vi.fn()
    render(<Stepper value={25} min={1} max={999} step={1} onChange={onChange} label="Focus Duration" />)
    const input = screen.getByRole('spinbutton', { name: /focus duration/i })
    await userEvent.clear(input)
    await userEvent.type(input, '9999')
    await userEvent.tab()
    expect(onChange).toHaveBeenCalledWith(999)
  })

  it('+ button is disabled when value is at max', () => {
    render(<Stepper value={999} min={1} max={999} step={1} onChange={vi.fn()} label="Focus Duration" />)
    expect(screen.getByRole('button', { name: /increment focus duration/i })).toBeDisabled()
  })

  it('− button is disabled when value is at min', () => {
    render(<Stepper value={1} min={1} max={999} step={1} onChange={vi.fn()} label="Focus Duration" />)
    expect(screen.getByRole('button', { name: /decrement focus duration/i })).toBeDisabled()
  })

  it('float step increments correctly', async () => {
    const onChange = vi.fn()
    render(<Stepper value={5} min={0.1} max={99} step={0.1} onChange={onChange} label="Break Ratio" />)
    await userEvent.click(screen.getByRole('button', { name: /increment break ratio/i }))
    expect(onChange).toHaveBeenCalledWith(expect.closeTo(5.1, 5))
  })

  it('float step decrements correctly', async () => {
    const onChange = vi.fn()
    render(<Stepper value={5} min={0.1} max={99} step={0.1} onChange={onChange} label="Break Ratio" />)
    await userEvent.click(screen.getByRole('button', { name: /decrement break ratio/i }))
    expect(onChange).toHaveBeenCalledWith(expect.closeTo(4.9, 5))
  })
})
