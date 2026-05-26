import type { SessionRecord } from '../../types/session'
import type { Settings } from '../../types/settings'
import type { RangeStats, BarChartEntry, StatsRange } from '../../types/stats'
import { bucketDay } from './bucketDay'

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_LABELS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

const isCompleted = (r: SessionRecord, threshold: number) =>
  r.netActiveMs / r.plannedDuration >= threshold / 100

const focusSessions = (sessions: SessionRecord[]) => sessions.filter(s => s.sessionType === 'focus')

const msToMin = (ms: number) => ms / 60_000

const hourLabel = (h: number): string => {
  if (h === 0)  return '12am'
  if (h < 12)   return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

const localHour = (ts: number, tzOffset: number): number =>
  new Date(ts + tzOffset * 60_000).getUTCHours()

const localDayOfWeek = (ts: number, tzOffset: number): number => {
  const jsDay = new Date(ts + tzOffset * 60_000).getUTCDay()
  return jsDay === 0 ? 6 : jsDay - 1
}

export const deriveRangeStats = (
  sessions: SessionRecord[],
  range: StatsRange,
  settings: Settings,
  now: number,
): RangeStats => {
  const { dayStartHour, countSessionAfterPercent } = settings
  const tzOffset = 0

  const todayKey  = bucketDay(now, tzOffset, dayStartHour)
  const nowDate   = new Date(now + tzOffset * 60_000)
  const nowYear   = nowDate.getUTCFullYear()
  const nowMonth  = nowDate.getUTCMonth()
  const nowDay    = nowDate.getUTCDate()

  const isoDayOfWeek = (ts: number) => localDayOfWeek(ts, tzOffset)

  const weekStart = (() => {
    const d = new Date(Date.UTC(nowYear, nowMonth, nowDay))
    const dow = d.getUTCDay() // 0=Sun..6=Sat
    const daysFromMon = (dow + 6) % 7
    return new Date(d.getTime() - daysFromMon * 86_400_000)
  })()

  const weekKeys = Array.from({ length: 7 }, (_, i) =>
    bucketDay(weekStart.getTime() + i * 86_400_000, tzOffset, dayStartHour))

  const daysInMonth = new Date(Date.UTC(nowYear, nowMonth + 1, 0)).getUTCDate()
  const monthKeys = Array.from({ length: daysInMonth }, (_, i) =>
    bucketDay(Date.UTC(nowYear, nowMonth, i + 1) + dayStartHour * 3_600_000, tzOffset, dayStartHour))

  const yearMonthKeys = Array.from({ length: 12 }, (_, i) => ({ m: i, year: nowYear }))

  const focusBucket = (s: SessionRecord) => bucketDay(s.startedAt, s.tzOffsetMinutes, dayStartHour)

  const focusInRange = (s: SessionRecord): boolean => {
    if (s.sessionType !== 'focus') return false
    const key = focusBucket(s)
    if (range === 'day')   return key === todayKey
    if (range === 'week')  return weekKeys.includes(key)
    if (range === 'month') return monthKeys.includes(key)
    if (range === 'year') {
      const d = new Date(s.startedAt + s.tzOffsetMinutes * 60_000)
      return d.getUTCFullYear() === nowYear
    }
    return false
  }

  const relevant = sessions.filter(focusInRange)
  const heroMinutes = Math.floor(relevant.reduce((s, r) => s + msToMin(r.netActiveMs), 0))

  const breakSessions = sessions.filter(s =>
    s.sessionType === 'short_break' || s.sessionType === 'long_break')

  let bars: BarChartEntry[] = []
  let chip1 = ''
  let chip2 = ''
  let chip3 = ''

  const sessionCount = (keys: string[]) => {
    const set = new Set(keys)
    return sessions.filter(s => s.sessionType === 'focus' && set.has(focusBucket(s))).length
  }

  const totalFocusOnKey = (key: string) =>
    sessions.filter(s => s.sessionType === 'focus' && focusBucket(s) === key)
      .reduce((a, s) => a + msToMin(s.netActiveMs), 0)

  if (range === 'day') {
    const nowHour = localHour(now, tzOffset)
    bars = Array.from({ length: 24 }, (_, h) => {
      const hMin = sessions
        .filter(s => s.sessionType === 'focus' && focusBucket(s) === todayKey && localHour(s.startedAt, s.tzOffsetMinutes) === h)
        .reduce((a, s) => a + msToMin(s.netActiveMs), 0)
      return { label: hourLabel(h), focusMinutes: Math.floor(hMin), isCurrent: h === nowHour }
    })

    const todayCount = sessions.filter(s => s.sessionType === 'focus' && focusBucket(s) === todayKey).length

    const byDayAllTime: Map<string, number> = new Map()
    focusSessions(sessions).forEach(s => {
      const k = focusBucket(s)
      byDayAllTime.set(k, (byDayAllTime.get(k) ?? 0) + 1)
    })
    const bestDayCount = byDayAllTime.size ? Math.max(...byDayAllTime.values()) : 0

    const last30Keys = new Set(Array.from({ length: 30 }, (_, i) =>
      bucketDay(now - i * 86_400_000, tzOffset, dayStartHour)))
    const last30Total = Array.from(last30Keys).reduce((a, k) => {
      const c = sessions.filter(s => s.sessionType === 'focus' && focusBucket(s) === k).length
      return a + c
    }, 0)
    const avgDaily30 = (last30Total / 30).toFixed(1)

    chip1 = `${todayCount} session${todayCount !== 1 ? 's' : ''}`
    chip2 = `Best: ${bestDayCount}`
    chip3 = `Avg: ${avgDaily30}`

  } else if (range === 'week') {
    const weekDayMins = weekKeys.map(k => totalFocusOnKey(k))
    const nowDow = isoDayOfWeek(now)
    bars = DAY_LABELS.map((label, i) => ({
      label,
      focusMinutes: Math.floor(weekDayMins[i]),
      isCurrent: i === nowDow,
    }))

    const weekCount = sessionCount(weekKeys)
    const bestDayIdx = weekDayMins.indexOf(Math.max(...weekDayMins))
    const avgDaily = (heroMinutes / 7).toFixed(0)

    chip1 = `${weekCount} sessions`
    chip2 = `Best: ${DAY_LABELS[bestDayIdx]}`
    chip3 = `Avg: ${avgDaily}m`

  } else if (range === 'month') {
    const nowDayOfMonth = nowDay
    bars = monthKeys.map((k, i) => ({
      label: String(i + 1),
      focusMinutes: Math.floor(totalFocusOnKey(k)),
      isCurrent: i + 1 === nowDayOfMonth,
    }))

    const monthCount = sessionCount(monthKeys)
    const dayMins = monthKeys.map(k => totalFocusOnKey(k))
    const bestDay = monthKeys.indexOf(monthKeys[dayMins.indexOf(Math.max(...dayMins))]) + 1
    const avgDaily = (heroMinutes / daysInMonth).toFixed(0)

    chip1 = `${monthCount} sessions`
    chip2 = `Best: ${bestDay}`
    chip3 = `Avg: ${avgDaily}m/day`

  } else {
    const monthMins = yearMonthKeys.map(({ m }) => {
      const start = Date.UTC(nowYear, m, 1)
      const end   = Date.UTC(nowYear, m + 1, 1)
      return sessions
        .filter(s => s.sessionType === 'focus' && s.startedAt >= start && s.startedAt < end)
        .reduce((a, s) => a + msToMin(s.netActiveMs), 0)
    })

    bars = MONTH_LABELS.map((label, i) => ({
      label,
      focusMinutes: Math.floor(monthMins[i]),
      isCurrent: i === nowMonth,
    }))

    const yearCount = sessions.filter(s => {
      if (s.sessionType !== 'focus') return false
      return new Date(s.startedAt).getUTCFullYear() === nowYear
    }).length
    const bestMonthIdx = monthMins.indexOf(Math.max(...monthMins))
    const avgMonthly = (heroMinutes / 12).toFixed(0)

    chip1 = `${yearCount} sessions`
    chip2 = `Best: ${MONTH_LABELS[bestMonthIdx]}`
    chip3 = `Avg: ${avgMonthly}m/month`
  }

  const breakKeys = (() => {
    if (range === 'day') return [todayKey]
    if (range === 'week') return weekKeys
    if (range === 'month') return monthKeys
    return null
  })()

  const breakCount = breakKeys
    ? breakSessions.filter(s => breakKeys.includes(focusBucket(s))).length
    : breakSessions.filter(s => new Date(s.startedAt).getUTCFullYear() === nowYear).length

  const relevantAvg = relevant.length ? (heroMinutes / relevant.length).toFixed(0) : '0'
  const longestMin = relevant.length
    ? Math.floor(Math.max(...relevant.map(s => msToMin(s.netActiveMs))))
    : 0

  const details = [
    { label: 'Sessions completed', value: String(relevant.length) },
    { label: 'Avg session length', value: `${relevantAvg}m` },
    { label: 'Longest session',    value: `${longestMin}m` },
    { label: 'Total breaks',       value: String(breakCount) },
  ]

  return { heroMinutes, chip1, chip2, chip3, bars, details }
}
