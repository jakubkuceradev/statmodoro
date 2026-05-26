import type { SessionRecord } from '../../types/session'
import type { Settings } from '../../types/settings'
import { bucketDay } from './bucketDay'

const isCompleted = (r: SessionRecord, threshold: number) =>
  r.netActiveMs / r.plannedDuration >= threshold / 100

export const deriveStreaks = (
  sessions: SessionRecord[],
  settings: Settings,
  now: number,
): { current: number; best: number } => {
  const { dailyStreakGoalMinutes, dayStartHour, countSessionAfterPercent } = settings
  const goalMs = dailyStreakGoalMinutes * 60_000

  const completedFocus = sessions.filter(
    s => s.sessionType === 'focus' &&
         s.endReason !== 'abandoned' &&
         isCompleted(s, countSessionAfterPercent),
  )

  if (completedFocus.length === 0) return { current: 0, best: 0 }

  const minutesByDay = new Map<string, number>()
  for (const s of completedFocus) {
    const key = bucketDay(s.startedAt, s.tzOffsetMinutes, dayStartHour)
    minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + s.netActiveMs)
  }

  const activeDays = new Set(
    Array.from(minutesByDay.entries())
      .filter(([, ms]) => ms >= goalMs)
      .map(([key]) => key),
  )

  if (activeDays.size === 0) return { current: 0, best: 0 }

  const todayKey = bucketDay(now, 0, dayStartHour)

  let current = 0
  let d = new Date(now)
  while (true) {
    const key = bucketDay(d.getTime(), 0, dayStartHour)
    if (!activeDays.has(key)) break
    current++
    d = new Date(d.getTime() - 86_400_000)
  }

  let best = 0
  let run = 0
  const sorted = Array.from(activeDays).sort()
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      run = 1
    } else {
      const prev = new Date(sorted[i - 1])
      const curr = new Date(sorted[i])
      const diff = (curr.getTime() - prev.getTime()) / 86_400_000
      run = diff === 1 ? run + 1 : 1
    }
    if (run > best) best = run
  }

  void todayKey
  return { current, best }
}
