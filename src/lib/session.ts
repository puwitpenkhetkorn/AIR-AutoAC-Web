// เก็บ token ใน sessionStorage ปกติ หรือ localStorage ถ้าติ๊ก "จำฉันไว้"
// ไม่เก็บ refresh token (D-18) — login ใหม่เมื่อหมดอายุ (~2.5 ชม.)

const KEY = 'autoac_session'

export interface Session {
  token: string
  userId: string
}

function storageFor(remember: boolean): Storage {
  return remember ? localStorage : sessionStorage
}

export function sessSet(session: Session, remember: boolean): void {
  sessionStorage.removeItem(KEY)
  localStorage.removeItem(KEY)
  storageFor(remember).setItem(KEY, JSON.stringify(session))
}

export function sessGet(): Session | null {
  const raw = sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export function sessClear(): void {
  sessionStorage.removeItem(KEY)
  localStorage.removeItem(KEY)
}
