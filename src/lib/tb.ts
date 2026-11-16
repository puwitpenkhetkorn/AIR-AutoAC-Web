// ThingsBoard REST client — เว็บคุยกับ ThingsBoard Cloud ตรง ไม่ผ่านตัวบอร์ด (ARCHITECTURE.md)
import { TB_HOST, FETCH_TIMEOUT_MS, RPC_TIMEOUT_MS } from '../config'
import { apiFetch, assertOk, readJson } from './apiFetch'
import { ApiError } from './apiError'
import type { AcEvent, DeviceInfo, Holidays, Role, Schedule, Telemetry } from '../types'

/** เรียกเมื่อเจอ 401 ระหว่างใช้งาน (ไม่ใช่ตอน login) — ให้ผู้เรียก logout */
let onUnauthorized: (() => void) | null = null
export function setOnUnauthorized(fn: (() => void) | null): void {
  onUnauthorized = fn
}

async function tbFetch(
  path: string,
  token: string | null,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = FETCH_TIMEOUT_MS, ...rest } = init
  const headers = new Headers(rest.headers)
  if (token) headers.set('X-Authorization', `Bearer ${token}`)
  headers.set('Content-Type', 'application/json')

  const res = await apiFetch(`${TB_HOST}${path}`, { ...rest, headers, timeoutMs })

  if (res.status === 401) {
    if (token) onUnauthorized?.()
    throw new ApiError('unauthorized', { status: 401 })
  }
  return res
}

export async function tbLogin(username: string, password: string): Promise<{ token: string }> {
  const res = await apiFetch(`${TB_HOST}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    timeoutMs: FETCH_TIMEOUT_MS,
  })
  if (res.status === 401) throw new ApiError('bad_credentials', { status: 401 })
  assertOk(res)
  const body = await readJson<{ token: string }>(res)
  if (!body?.token) throw new ApiError('bad_response', { status: res.status })
  return { token: body.token }
}

export async function tbResetPassword(email: string): Promise<void> {
  const res = await apiFetch(`${TB_HOST}/api/noauth/resetPasswordByEmail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
    timeoutMs: FETCH_TIMEOUT_MS,
  })
  assertOk(res)
}

interface TbUserResponse {
  id: { id: string }
  authority: string
  customerId?: { id: string }
}

export async function tbGetUser(token: string): Promise<{ userId: string; role: Role; customerId?: string }> {
  const res = await tbFetch('/api/auth/user', token)
  assertOk(res)
  const body = await readJson<TbUserResponse>(res)
  if (!body) throw new ApiError('bad_response', { status: res.status })
  const role: Role = body.authority === 'TENANT_ADMIN' ? 'ADMIN' : 'USER'
  const customerId = body.customerId?.id !== '13814000-1dd2-11b2-8080-808080808080' ? body.customerId?.id : undefined
  return { userId: body.id.id, role, customerId }
}

interface TbDeviceInfoRaw {
  id: { id: string }
  name: string
  label?: string
  active?: boolean
}

function mapDevice(d: TbDeviceInfoRaw): DeviceInfo {
  return { id: d.id.id, name: d.name, label: d.label, active: d.active }
}

export async function tbGetTenantDevices(token: string): Promise<DeviceInfo[]> {
  const res = await tbFetch('/api/tenant/devices?pageSize=100&page=0', token)
  assertOk(res)
  const body = await readJson<{ data: TbDeviceInfoRaw[] }>(res)
  const devices = (body?.data ?? []).map(mapDevice)
  // /api/tenant/devices ไม่มีฟิลด์ active ติดมา (endpoint deviceInfos ใช้ไม่ได้บน instance นี้ — 400 Invalid UUID)
  // ต้องดึงสถานะ active แยกต่อเครื่องจาก SERVER_SCOPE attribute
  const withActive = await Promise.all(
    devices.map(async (d) => ({ ...d, active: await tbGetDeviceActive(token, d.id) })),
  )
  return withActive
}

export async function tbGetCustomerDeviceInfos(token: string, customerId: string): Promise<DeviceInfo[]> {
  const res = await tbFetch(`/api/customer/${customerId}/deviceInfos?pageSize=100&page=0`, token)
  assertOk(res)
  const body = await readJson<{ data: TbDeviceInfoRaw[] }>(res)
  return (body?.data ?? []).map(mapDevice)
}

export async function tbGetDeviceActive(token: string, deviceId: string): Promise<boolean | undefined> {
  const res = await tbFetch(`/api/plugins/telemetry/DEVICE/${deviceId}/values/attributes/SERVER_SCOPE`, token)
  assertOk(res)
  const body = await readJson<Array<{ key: string; value: unknown }>>(res)
  const active = body?.find((a) => a.key === 'active')
  return typeof active?.value === 'boolean' ? active.value : undefined
}

interface TsEntry {
  ts: number
  value: string
}

export async function tbGetLatestTelemetry(token: string, deviceId: string): Promise<Telemetry> {
  const keys = ['temp', 'humidity', 'occupied', 'ac_on', 'ac_set_temp', 'ac_mode', 'ac_fan']
  const res = await tbFetch(
    `/api/plugins/telemetry/DEVICE/${deviceId}/values/timeseries?keys=${keys.join(',')}`,
    token,
  )
  assertOk(res)
  const body = await readJson<Record<string, TsEntry[]>>(res)
  const out: Telemetry = {}
  let latestTs = 0
  if (body) {
    for (const key of keys) {
      const entry = body[key]?.[0]
      if (!entry) continue
      latestTs = Math.max(latestTs, entry.ts)
      const raw = entry.value
      if (key === 'occupied' || key === 'ac_on') {
        ;(out as Record<string, unknown>)[key] = raw === 'true' || raw === '1'
      } else {
        ;(out as Record<string, unknown>)[key] = Number(raw)
      }
    }
  }
  out.ts = latestTs || undefined
  return out
}

export async function tbGetHistory(
  token: string,
  deviceId: string,
  keys: string[],
  startTs: number,
  endTs: number,
  limit = 1000,
): Promise<Record<string, TsEntry[]>> {
  const res = await tbFetch(
    `/api/plugins/telemetry/DEVICE/${deviceId}/values/timeseries?keys=${keys.join(
      ',',
    )}&startTs=${startTs}&endTs=${endTs}&limit=${limit}&orderBy=ASC`,
    token,
  )
  assertOk(res)
  return (await readJson<Record<string, TsEntry[]>>(res)) ?? {}
}

export async function tbGetEvents(token: string, deviceId: string, startTs: number, endTs: number): Promise<AcEvent[]> {
  const keys = ['ac_command', 'source', 'reason']
  const data = await tbGetHistory(token, deviceId, keys, startTs, endTs, 200)
  const byTs = new Map<number, AcEvent>()
  for (const key of keys) {
    for (const entry of data[key] ?? []) {
      const ev = byTs.get(entry.ts) ?? { ts: entry.ts }
      ;(ev as unknown as Record<string, unknown>)[key] = entry.value
      byTs.set(entry.ts, ev)
    }
  }
  return [...byTs.values()].sort((a, b) => b.ts - a.ts)
}

interface AttrEntry {
  key: string
  value: unknown
}

export async function tbGetSharedAttributes(token: string, deviceId: string): Promise<Record<string, unknown>> {
  const res = await tbFetch(`/api/plugins/telemetry/DEVICE/${deviceId}/values/attributes/SHARED_SCOPE`, token)
  assertOk(res)
  const body = await readJson<AttrEntry[]>(res)
  const out: Record<string, unknown> = {}
  for (const a of body ?? []) out[a.key] = a.value
  return out
}

export function parseSchedule(raw: unknown): Schedule {
  if (Array.isArray(raw)) return raw as Schedule
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Schedule
    } catch {
      /* ignore */
    }
  }
  return Array.from({ length: 7 }, () => [
    { en: false, s: 480, e: 1020 },
    { en: false, s: 480, e: 1020 },
  ])
}

export function parseHolidays(raw: unknown): Holidays {
  if (Array.isArray(raw)) return raw as Holidays
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Holidays
    } catch {
      /* ignore */
    }
  }
  return []
}

export async function tbRpc(
  token: string,
  deviceId: string,
  method: string,
  params: unknown = {},
): Promise<{ ok: boolean }> {
  // one-way: ThingsBoard ตอบทันทีที่รับคำสั่งเข้าคิว MQTT ไม่รอบอร์ด ack (เร็วกว่า twoway มาก)
  // สอดคล้องกับหลักการเดิม "ยังไม่ยืนยันสถานะแอร์จริง" (IR เป็น one-way อยู่แล้ว)
  const res = await tbFetch(`/api/plugins/rpc/oneway/${deviceId}`, token, {
    method: 'POST',
    body: JSON.stringify({ method, params }),
    timeoutMs: RPC_TIMEOUT_MS,
  })
  if (res.status === 408 || res.status === 504) {
    throw new ApiError('device_timeout', { status: res.status })
  }
  assertOk(res)
  return { ok: true }
}
