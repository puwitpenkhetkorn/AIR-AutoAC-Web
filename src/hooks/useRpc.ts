import { useCallback, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { tbRpc } from '../lib/tb'
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
