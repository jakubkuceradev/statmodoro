import type { SessionRecord } from '../../types/session'
import type { Settings } from '../../types/settings'
import type { AnalysisStats } from '../../types/stats'
import { bucketDay } from './bucketDay'
import { deriveStreaks } from './streak'

const BUCKET_LABELS = ['<10', '10–20', '20–30', '30–45', '45–60', '60+']

const toBucket = (minutes: number): string => {
  if (minutes < 10) return '<10'
  if (minutes < 20) return '10–20'
  if (minutes < 30) return '20–30'
  if (minutes < 45) return '30–45'
  if (minutes < 60) return '45–60'
  return '60+'
}

const isCompleted = (r: SessionRecord, threshold: number) =>
  r.netActiveMs / r.plannedDuration >= threshold / 100

const msToMin = (ms: number) => ms / 60_000

const localHour = (ts: number, tzOffset: number): number =>
  new Date(ts + tzOffset * 60_000).getUTCHours()

const localDayOfWeek = (ts: number, tzOffset: number): number => {
  const jsDay = new Date(ts + tzOffset * 60_000).getUTCDay()
  return jsDay === 0 ? 6 : jsDay - 1
}

export const deriveAnalysisStats = (
  sessions: SessionRecord[],
  settings: Settings,
  now: number = Date.now(),
): AnalysisStats => {
  const { dayStartHour, countSessionAfterPercent } = settings

  const focusSessions = sessions.filter(s => s.sessionType === 'focus')
  const breakSessions = sessions.filter(
    s => s.sessionType === 'short_break' || s.sessionType === 'long_break')

  const completedFocus = focusSessions.filter(s =>
    s.endReason !== 'abandoned' && isCompleted(s, countSessionAfterPercent))

  const allTimeMinutes = Math.floor(focusSessions.reduce((a, s) => a + msToMin(s.netActiveMs), 0))
  const allTimeSessions = completedFocus.length

  const activeDayKeys = new Set(
    completedFocus.map(s => bucketDay(s.startedAt, s.tzOffsetMinutes, dayStartHour)))
  const allTimeActiveDays = activeDayKeys.size

  const longestSessionMinutes = focusSessions.length
    ? Math.floor(Math.max(...focusSessions.map(s => msToMin(s.netActiveMs))))
    : 0

  const byDay = new Map<string, number>()
  for (const s of completedFocus) {
    const k = bucketDay(s.startedAt, s.tzOffsetMinutes, dayStartHour)
    byDay.set(k, (byDay.get(k) ?? 0) + msToMin(s.netActiveMs))
  }
  const bestDayMinutes = byDay.size ? Math.floor(Math.max(...byDay.values())) : 0

  const { longestStreak } = deriveStreaks(sessions, settings, now)

  const completionRate = focusSessions.length === 0
    ? 0
    : completedFocus.length / focusSessions.length

  const breakComplianceRate = completedFocus.length === 0
    ? 0
    : breakSessions.length / completedFocus.length

  const focusByHour: number[] = Array(24).fill(0)
  const hourDayCounts: number[] = Array(24).fill(0)
  const hourDaysSeen: Set<string>[] = Array.from({ length: 24 }, () => new Set())
  for (const s of focusSessions) {
    const h = localHour(s.startedAt, s.tzOffsetMinutes)
    const dk = bucketDay(s.startedAt, s.tzOffsetMinutes, dayStartHour)
    focusByHour[h] += msToMin(s.netActiveMs)
    hourDaysSeen[h].add(dk)
  }
  for (let h = 0; h < 24; h++) {
    hourDayCounts[h] = hourDaysSeen[h].size
    if (hourDayCounts[h] > 0) focusByHour[h] /= hourDayCounts[h]
  }

  const focusByDayOfWeek: number[] = Array(7).fill(0)
  const dowDaysSeen: Set<string>[] = Array.from({ length: 7 }, () => new Set())
  for (const s of focusSessions) {
    const dow = localDayOfWeek(s.startedAt, s.tzOffsetMinutes)
    const dk = bucketDay(s.startedAt, s.tzOffsetMinutes, dayStartHour)
    focusByDayOfWeek[dow] += msToMin(s.netActiveMs)
    dowDaysSeen[dow].add(dk)
  }
  for (let d = 0; d < 7; d++) {
    if (dowDaysSeen[d].size > 0) focusByDayOfWeek[d] /= dowDaysSeen[d].size
  }

  const sessionLengthBuckets = BUCKET_LABELS.map(rangeLabel => ({
    rangeLabel,
    count: focusSessions.filter(s => toBucket(msToMin(s.netActiveMs)) === rangeLabel).length,
  }))

  const densityMatrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
  const densityCounts: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
  for (const s of focusSessions) {
    const dow = localDayOfWeek(s.startedAt, s.tzOffsetMinutes)
    const h = localHour(s.startedAt, s.tzOffsetMinutes)
    densityMatrix[dow][h] += msToMin(s.netActiveMs)
    densityCounts[dow][h]++
  }
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (densityCounts[d][h] > 0) densityMatrix[d][h] /= densityCounts[d][h]
    }
  }

  const calendarHeatmap: { date: string; minutes: number }[] = []
  const dayMs = 86_400_000
  for (let i = 364; i >= 0; i--) {
    const ts = now - i * dayMs
    const date = bucketDay(ts, 0, dayStartHour)
    const minutes = Math.floor(
      completedFocus
        .filter(s => bucketDay(s.startedAt, s.tzOffsetMinutes, dayStartHour) === date)
        .reduce((a, s) => a + msToMin(s.netActiveMs), 0))
    calendarHeatmap.push({ date, minutes })
  }

  const firstSessionByDay = new Map<string, number>()
  for (const s of completedFocus) {
    const dk = bucketDay(s.startedAt, s.tzOffsetMinutes, dayStartHour)
    const existing = firstSessionByDay.get(dk)
    if (existing === undefined || s.startedAt < existing) firstSessionByDay.set(dk, s.startedAt)
  }
  let avgMinutesToFirstSession = 0
  if (firstSessionByDay.size > 0) {
    let total = 0
    firstSessionByDay.forEach((firstTs, dk) => {
      const [y, m, d] = dk.split('-').map(Number)
      const dayBoundary = Date.UTC(y, m - 1, d) + dayStartHour * 3_600_000
      total += msToMin(firstTs - dayBoundary)
    })
    avgMinutesToFirstSession = total / firstSessionByDay.size
  }

  return {
    calendarHeatmap,
    focusByHour,
    focusByDayOfWeek,
    sessionLengthBuckets,
    densityMatrix,
    allTimeMinutes,
    allTimeSessions,
    allTimeActiveDays,
    longestSessionMinutes,
    bestDayMinutes,
    longestStreak,
    completionRate,
    breakComplianceRate,
    avgMinutesToFirstSession,
  }
}
