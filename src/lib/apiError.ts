// จัดการ error ของการเรียก API ทุกจุดที่เดียว (SPEC.md ข้อ 6)
// ห้ามแสดงข้อความดิบ/JSON/stack ของ error จาก fetch/ThingsBoard ตรงๆ

export class ApiError extends Error {
  status?: number
  isTimeout: boolean
  isNetwork: boolean

  constructor(message: string, opts: { status?: number; isTimeout?: boolean; isNetwork?: boolean } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = opts.status
    this.isTimeout = opts.isTimeout ?? false
    this.isNetwork = opts.isNetwork ?? false
  }
}

/** แปลง error เป็นข้อความไทยตามตารางใน SPEC.md ข้อ 6 */
export function apiErrorText(err: unknown, context: 'login' | 'generic' = 'generic'): string {
  if (err instanceof ApiError) {
    if (err.isNetwork) return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่'
    if (err.isTimeout) return 'เซิร์ฟเวอร์ตอบช้า กรุณาลองใหม่อีกครั้ง'
    if (err.status === 400) return 'ข้อมูลที่ส่งไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง'
    if (err.status === 401) return context === 'login' ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'
    if (err.status === 404) return 'ไม่พบข้อมูลที่ต้องการ'
    if (err.status !== undefined && err.status >= 500) return 'เซิร์ฟเวอร์ไม่พร้อมใช้งานชั่วคราว ลองใหม่ภายหลัง'
  }
  return 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
}
