export interface Settings {
  focusDuration: number
  shortBreakDuration: number
  longBreakDuration: number
  sessionsPerLoop: number
  countSessionAfterPercent: number

  autoStartBreaks: boolean
  autoStartFocus: boolean
  dailyStreakGoalMinutes: number
  mode: 'pomodoro' | 'flowmodoro'
  flowmodoroBreakRatio: number
  dayStartHour: number

  soundAlertsEnabled: boolean
  volume: number
  desktopNotificationsEnabled: boolean
}
