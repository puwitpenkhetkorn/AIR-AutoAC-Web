import { useCallback, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { tbRpc, tbRpcConfirmed } from '../lib/tb'
import { apiErrorText } from '../lib/apiError'
import { useToast } from '../context/ToastContext'

/** ส่ง RPC ไปอุปกรณ์ + toast ตามผล (ARCHITECTURE.md: controlSend) */
export function useRpc(deviceId: string | null) {
  const { token } = useAuth()
  const { show } = useToast()
  const [sending, setSending] = useState(false)

  const send = useCallback(
    async (method: string, params: unknown = {}) => {
      if (!token || !deviceId) return false
      setSending(true)
      try {
        const { ok } = await tbRpc(token, deviceId, method, params)
        show(ok ? 'ส่งคำสั่งแล้ว' : 'อุปกรณ์ไม่รับคำสั่ง')
        return ok
      } catch (err) {
        show(apiErrorText(err))
        return false
      } finally {
        setSending(false)
      }
    },
    [token, deviceId, show],
  )

  return { send, sending }
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'failed'

/**
 * เหมือน useRpc แต่รอ ack จริงจากบอร์ด (two-way) — ใช้ตอนต้องรู้ชัดๆว่าคำสั่งถึงบอร์ดจริงไหม
 * เช่น แก้ตารางเรียน ที่ถ้าบอร์ดออฟไลน์ตอนกดบันทึก จะไม่มีทางรู้เลยถ้าใช้ oneway (ThingsBoard ตอบ ok ทันทีไม่ว่าบอร์ดจะได้รับจริงหรือไม่)
 */
export function useRpcConfirmed(deviceId: string | null) {
  const { token } = useAuth()
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<SyncStatus>('idle')

  const send = useCallback(
    async (method: string, params: unknown = {}) => {
      if (!token || !deviceId) return false
      setSending(true)
      setStatus('syncing')
      try {
        const { ok } = await tbRpcConfirmed(token, deviceId, method, params)
        setStatus(ok ? 'synced' : 'failed')
        return ok
      } catch {
        setStatus('failed')
        return false
      } finally {
        setSending(false)
      }
    },
    [token, deviceId],
  )

  return { send, sending, status }
}
