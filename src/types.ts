export type Role = 'ADMIN' | 'USER'

export interface AuthUser {
  userId: string
  role: Role
  customerId?: string
}

export interface DeviceInfo {
  id: string
  name: string
  label?: string
  active?: boolean
}

export interface Telemetry {
  temp?: number
  humidity?: number
  occupied?: boolean
  ac_on?: boolean
  ac_set_temp?: number
  ac_mode?: number
  ac_fan?: number
  thermalPresent?: boolean
  thermalPixels?: number[] // 64 ค่า (8x8), undefined ถ้า thermalPresent เป็น false
  thermalMax?: number
  thermalMin?: number
  radarState?: number // 0=ไม่มีเป้าหมาย 1=เคลื่อนไหว 2=นิ่ง 3=ทั้งสอง
  radarMoveDistCm?: number
  radarMoveEnergy?: number
  radarStaticDistCm?: number
  radarStaticEnergy?: number
  radarDetectRangeCm?: number
  ts?: number
}

export interface DeviceSettings {
  emptyMin?: number
  graceSec?: number
  hot?: number
  autoOn?: boolean
  preOpenMin?: number
  irMode?: 'protocol' | 'learned'
  irLearned?: boolean[] // length 4, index ตาม IrButton (เปิด, ปิด, อุณหภูมิ+, อุณหภูมิ-)
  irLearnStatus?: string // "idle" | "listening:<button>" | "ok:<button>" | "timeout:<button>" | "busy"
}

// คาบเรียน 1 รายการ — ตรงกับ autoac::SchedulePeriod ฝั่งเฟิร์มแวร์
export interface SchedulePeriod {
  id: number // index+1 ใน array ฝั่งบอร์ด (ใช้แก้ไข/ลบ)
  day: number // 0=จันทร์..6=อาทิตย์
  startMin: number
  endMin: number
  validFromDay: number // days-since-epoch, 0 = ไม่จำกัด
  validToDay: number
  enabled: boolean
  name: string
}

export type SchedulePeriods = SchedulePeriod[]

export type Holidays = string[] // YYYY-MM-DD

export interface AcEvent {
  ts: number
  ac_command?: string
  source?: string
  reason?: string
}

export interface RpcResult {
  ok: boolean
}
