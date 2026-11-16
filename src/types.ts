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
  ts?: number
}

export interface DeviceSettings {
  emptyMin?: number
  graceSec?: number
  hot?: number
  autoOn?: boolean
  preOpenMin?: number
}

export interface ScheduleSlot {
  en: boolean
  s: number // นาทีจากเที่ยงคืน
  e: number
}

export type Schedule = ScheduleSlot[][] // [day 0-6][slot 0-1]

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
