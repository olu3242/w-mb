export function formatLocalDateTime(value: string | Date | null | undefined, timezone = 'UTC', locale = 'en-US') {
  if (!value) return 'TBD'

  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return 'Invalid date'

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(date)
}

export function getTimezoneOffsetLabel(timezone = 'UTC') {
  try {
    const now = new Date()
    const options = { timeZone: timezone, hour12: false, timeStyle: 'short' } as const
    return new Intl.DateTimeFormat('en-US', options).format(now)
  } catch {
    return timezone
  }
}
