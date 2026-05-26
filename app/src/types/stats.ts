export type StatsRange = 'day' | 'week' | 'month' | 'year'

export interface BarChartEntry {
  label: string
  focusMinutes: number
  isCurrent: boolean
}

export interface RangeStats {
  heroMinutes: number
  chip1: string
  chip2: string
  chip3: string
  bars: BarChartEntry[]
  details: { label: string; value: string; accent?: boolean }[]
}

export interface AnalysisStats {
  calendarHeatmap: { date: string; minutes: number }[]
  focusByHour: number[]
  focusByDayOfWeek: number[]
  sessionLengthBuckets: { rangeLabel: string; count: number }[]
  densityMatrix: number[][]
  allTimeMinutes: number
  allTimeSessions: number
  allTimeActiveDays: number
  longestSessionMinutes: number
  bestDayMinutes: number
  longestStreak: number
  completionRate: number
  breakComplianceRate: number
  avgMinutesToFirstSession: number
}
