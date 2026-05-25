import type { Settings } from '../../types/settings'

export const DEFAULT_SETTINGS: Settings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsPerLoop: 4,
  countSessionAfterPercent: 50,
  autoStartBreaks: false,
  autoStartFocus: false,
  dailyStreakGoalMinutes: 60,
  mode: 'pomodoro',
  flowmodoroBreakRatio: 5,
  dayStartHour: 0,
  soundAlertsEnabled: true,
  volume: 0.7,
  desktopNotificationsEnabled: false,
}
