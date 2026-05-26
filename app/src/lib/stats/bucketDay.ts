export const bucketDay = (timestampMs: number, tzOffsetMinutes: number, dayStartHour: number): string => {
  const localMs = timestampMs + tzOffsetMinutes * 60_000
  const adjustedMs = localMs - dayStartHour * 3_600_000
  const d = new Date(adjustedMs)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
