export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60) % 24
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export const DAY_NAMES = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์']
export const DAY_SHORT = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']

// days-since-epoch (1970-01-01, UTC civil calendar) <-> "YYYY-MM-DD" — ต้องตรงกับ daysFromCivil() ฝั่งเฟิร์มแวร์ (lib/autoac_core/types.h)
export function dateToEpochDay(dateStr: string): number {
  if (!dateStr) return 0
  const [y, m, d] = dateStr.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000)
}

export function epochDayToDate(day: number): string {
  if (!day) return ''
  const d = new Date(day * 86400000)
  return d.toISOString().slice(0, 10)
}
