import type { ReactNode } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { Screen } from '../layout/Screen'
import { Stepper } from './Stepper'
import { Toggle } from './Toggle'

const actionBtnCls = 'font-sans text-[12px] bg-transparent border-none cursor-pointer p-0 opacity-85 hover:opacity-100'
const dangerBtnCls = 'font-sans text-[12px] bg-transparent border-none cursor-pointer p-0 opacity-80 hover:opacity-100'
const sliderCls = 'w-[100px] h-[3px] cursor-pointer appearance-none rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[14px] [&::-webkit-slider-thumb]:h-[14px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:w-[14px] [&::-moz-range-thumb]:h-[14px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-none'

export const SettingsScreen = () => {
  const { settings, updateSettings } = useSettings()

  return (
    <Screen label="Settings">

      <Group label="Timer">
        <Row label="Focus Duration">
          <Stepper label="Focus Duration" unit="min"
            value={settings.focusDuration} min={1} max={999} step={1}
            onChange={v => updateSettings({ focusDuration: v })} />
        </Row>
        <Row label="Short Break">
          <Stepper label="Short Break" unit="min"
            value={settings.shortBreakDuration} min={1} max={999} step={1}
            onChange={v => updateSettings({ shortBreakDuration: v })} />
        </Row>
        <Row label="Long Break">
          <Stepper label="Long Break" unit="min"
            value={settings.longBreakDuration} min={1} max={999} step={1}
            onChange={v => updateSettings({ longBreakDuration: v })} />
        </Row>
        <Row label="Sessions Per Loop">
          <Stepper label="Sessions Per Loop"
            value={settings.sessionsPerLoop} min={1} max={20} step={1}
            onChange={v => updateSettings({ sessionsPerLoop: v })} />
        </Row>
        <Row label="Count Session After">
          <Stepper label="Count Session After" unit="%"
            value={settings.countSessionAfterPercent} min={1} max={100} step={1}
            onChange={v => updateSettings({ countSessionAfterPercent: v })} />
        </Row>
      </Group>

      <Group label="Behaviour">
        <Row label="Auto-Start Breaks">
          <Toggle label="Auto-Start Breaks"
            checked={settings.autoStartBreaks}
            onChange={v => updateSettings({ autoStartBreaks: v })} />
        </Row>
        <Row label="Auto-Start Focus">
          <Toggle label="Auto-Start Focus"
            checked={settings.autoStartFocus}
            onChange={v => updateSettings({ autoStartFocus: v })} />
        </Row>
        <Row label="Flowmodoro Mode">
          <Toggle label="Flowmodoro"
            checked={settings.mode === 'flowmodoro'}
            onChange={v => updateSettings({ mode: v ? 'flowmodoro' : 'pomodoro' })} />
        </Row>
        {settings.mode === 'flowmodoro' && (
          <Row label="Break Ratio">
            <Stepper label="Break Ratio"
              value={settings.flowmodoroBreakRatio} min={0.1} max={99} step={0.1}
              onChange={v => updateSettings({ flowmodoroBreakRatio: v })} />
          </Row>
        )}
        <Row label="Daily Streak Goal">
          <Stepper label="Daily Streak Goal" unit="min"
            value={settings.dailyStreakGoalMinutes} min={1} max={1440} step={5}
            onChange={v => updateSettings({ dailyStreakGoalMinutes: v })} />
        </Row>
        <Row label="Day Start Time">
          <Stepper label="Day Start Time"
            value={settings.dayStartHour} min={0} max={23.5} step={0.5}
            onChange={v => updateSettings({ dayStartHour: v })} />
        </Row>
      </Group>

      <Group label="Notifications">
        <Row label="Sound Alerts">
          <Toggle label="Sound Alerts"
            checked={settings.soundAlertsEnabled}
            onChange={v => updateSettings({ soundAlertsEnabled: v })} />
        </Row>
        <Row label="Desktop Notifications">
          <Toggle label="Desktop Notifications"
            checked={settings.desktopNotificationsEnabled}
            onChange={v => updateSettings({ desktopNotificationsEnabled: v })} />
        </Row>
        <Row label="Volume">
          <input
            type="range"
            aria-label="Volume"
            min={0} max={1} step={0.01}
            value={settings.volume}
            onChange={e => updateSettings({ volume: parseFloat(e.target.value) })}
            className={sliderCls}
            style={{
              background: `linear-gradient(to right, var(--accent) ${settings.volume * 100}%, var(--color-surface-raised) ${settings.volume * 100}%)`,
            }}
          />
        </Row>
      </Group>

      <Group label="Data">
        <DataRow>
          <span className="font-sans text-[12px] text-text-secondary">Import Data</span>
          <button
            aria-label="Import Data"
            onClick={() => {}}
            className={actionBtnCls}
            style={{ color: '#0A84FF', transition: 'opacity var(--ease-fast)' }}
          >
            Import
          </button>
        </DataRow>
        <DataRow>
          <span className="font-sans text-[12px] text-text-secondary">Export Data</span>
          <button
            aria-label="Export Data"
            onClick={() => {}}
            className={actionBtnCls}
            style={{ color: '#0A84FF', transition: 'opacity var(--ease-fast)' }}
          >
            Export
          </button>
        </DataRow>
        <DataRow>
          <span className="font-sans text-[12px] text-text-secondary">Clear All History</span>
          <button
            aria-label="Clear All History"
            onClick={() => {}}
            className={dangerBtnCls}
            style={{ color: '#FF453A', transition: 'opacity var(--ease-fast)' }}
          >
            Remove
          </button>
        </DataRow>
        <DataRow>
          <span className="font-sans text-[12px] text-text-secondary">Reset All Settings</span>
          <button
            aria-label="Reset All Settings"
            onClick={() => {}}
            className={dangerBtnCls}
            style={{ color: '#FF453A', transition: 'opacity var(--ease-fast)' }}
          >
            Reset
          </button>
        </DataRow>
      </Group>

    </Screen>
  )
}

const Group = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col mt-[18px] first:mt-0">
    <h2 className="font-sans font-medium text-[9px] uppercase tracking-[0.16em] text-text-muted mb-[8px]">
      {label}
    </h2>
    {children}
  </div>
)

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-center justify-between py-[9px] border-b border-border last:border-b-0 gap-3">
    <span className="font-sans text-[12px] text-text-secondary whitespace-nowrap">{label}</span>
    {children}
  </div>
)

const DataRow = ({ children }: { children: ReactNode }) => (
  <div className="flex items-center justify-between py-[9px] border-b border-border last:border-b-0">
    {children}
  </div>
)
