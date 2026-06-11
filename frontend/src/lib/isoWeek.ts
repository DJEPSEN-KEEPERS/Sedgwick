export interface WeekDescriptor {
  year: number
  week: number
  monday: Date
  isPast: boolean
  isCurrent: boolean
}

/** Returns ISO week number and ISO year for a given date. */
export function getISOWeekInfo(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  // Set to nearest Thursday: current date + 4 - current day number, make Sunday's day number 7
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { year: d.getUTCFullYear(), week }
}

/** Returns the Monday of the given ISO week. */
export function getMondayOfISOWeek(year: number, week: number): Date {
  // Jan 4 is always in week 1 of its ISO year
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = jan4.getUTCDay() || 7 // 1=Mon ... 7=Sun
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7)
  return monday
}

/**
 * Returns an array of WeekDescriptors: `weeksBack` weeks in the past
 * through `weeksForward` weeks in the future (relative to today).
 */
export function getWeekRange(weeksBack = 4, weeksForward = 12): WeekDescriptor[] {
  const today = new Date()
  const { year: cy, week: cw } = getISOWeekInfo(today)
  const currentMonday = getMondayOfISOWeek(cy, cw)

  const result: WeekDescriptor[] = []
  for (let offset = -weeksBack; offset <= weeksForward; offset++) {
    const monday = new Date(currentMonday)
    monday.setUTCDate(currentMonday.getUTCDate() + offset * 7)
    const { year, week } = getISOWeekInfo(monday)
    result.push({ year, week, monday, isPast: offset < 0, isCurrent: offset === 0 })
  }
  return result
}

/** Formats Monday date as "9. jun" */
export function formatWeekDate(monday: Date): string {
  return monday.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}
