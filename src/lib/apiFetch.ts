import { ApiError } from './apiError'

interface FetchOpts extends RequestInit {
  timeoutMs?: number
}

/** fetch พร้อม timeout และแปลง error ของเน็ต/timeout เป็น ApiError (SPEC.md ข้อ 6) */
export async function apiFetch(url: string, opts: FetchOpts = {}): Promise<Response> {
  const { timeoutMs = 10_000, ...rest } = opts
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, { ...rest, signal: controller.signal })
    return res
  } catch {
    if (controller.signal.aborted) {
      throw new ApiError('timeout', { isTimeout: true })
    }
    throw new ApiError('network', { isNetwork: true })
  } finally {
    clearTimeout(timer)
  }
}

/** อ่าน body เป็น JSON อย่างปลอดภัย — ตอบกลับที่ไม่ใช่ JSON (เช่น 503 เป็น HTML) ต้องไม่พัง */
export async function readJson<T = unknown>(res: Response): Promise<T | undefined> {
  const text = await res.text()
  if (!text) return undefined
  try {
    return JSON.parse(text) as T
  } catch {
    return undefined
  }
}

/** ตรวจ response ว่า ok ไหม ถ้าไม่ ok ให้ throw ApiError พร้อม status */
export function assertOk(res: Response): void {
  if (!res.ok) {
    throw new ApiError(`http_${res.status}`, { status: res.status })
  }
}
