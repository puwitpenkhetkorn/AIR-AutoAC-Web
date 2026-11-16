export const TB_HOST = import.meta.env.VITE_TB_HOST ?? 'https://eu.thingsboard.cloud'

export const STALE_MS = 2 * 60 * 1000 // ข้อมูลเกิน 2 นาทีถือว่าล้าสมัย (SPEC ข้อ 1.3)
export const POLL_MS = 4 * 1000 // poll telemetry ทุก ~4 วินาที
export const FETCH_TIMEOUT_MS = 10 * 1000
export const RPC_TIMEOUT_MS = 15 * 1000

export const TEMP_MIN = 16
export const TEMP_MAX = 30

export const AC_MODES = [
  { value: 0, label: 'เย็น' },
  { value: 1, label: 'พัดลม' },
  { value: 2, label: 'ลดความชื้น' },
  { value: 3, label: 'อัตโนมัติ' },
] as const

export const AC_FANS = [
  { value: 0, label: 'อัตโนมัติ' },
  { value: 1, label: 'ต่ำ' },
  { value: 2, label: 'กลาง' },
  { value: 3, label: 'สูง' },
] as const
