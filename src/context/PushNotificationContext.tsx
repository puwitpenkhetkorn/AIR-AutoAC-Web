import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { useRooms, roomDisplayName } from './RoomContext'
import { tbGetEvents } from '../lib/tb'
import type { AcEvent } from '../types'

const NOTIF_KEY = 'autoac_notif_enabled' // key เดียวกับที่ Alerts.tsx ใช้ (เปิด/ปิดการแจ้งเตือนทั้งหมด)
const POLL_MS = 10 * 1000 // ไม่ต้องถี่เท่า telemetry — เหตุการณ์ไม่ได้เกิดบ่อย

interface PushItem {
  id: number
  title: string
  body: string
}

interface PushContextValue {
  items: PushItem[]
  dismiss: (id: number) => void
}

const PushContext = createContext<PushContextValue | null>(null)

let nextId = 1

// แปลง ac_command/source ให้อ่านง่ายขึ้น (ตรงกับที่ control_task.cpp ส่งมาจริง — ดู publishEvent)
function describeEvent(ev: AcEvent): { title: string; body: string } {
  const cmd = ev.ac_command ?? ''
  const onOff = cmd.includes('on') ? 'เปิดแอร์' : cmd.includes('off') ? 'ปิดแอร์' : cmd
  const sourceLabel: Record<string, string> = {
    auto: 'อัตโนมัติ', schedule: 'ตามตาราง', web: 'เว็บ', screen: 'จอเครื่อง',
    hw: 'เครื่องมือช่าง', telegram: 'Telegram', thingsboard: 'ThingsBoard',
  }
  const src = sourceLabel[(ev.source ?? '').toLowerCase()] ?? ev.source ?? ''
  return { title: onOff || 'เหตุการณ์แอร์', body: [src, ev.reason].filter(Boolean).join(' — ') }
}

// แจ้งเตือนแบบ push บนเว็บ — poll เหตุการณ์ใหม่ของห้องที่เลือกอยู่ แล้วเด้ง banner (ดู .push-banner ใน index.css)
export function PushNotificationProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const { selectedRoom } = useRooms()
  const [items, setItems] = useState<PushItem[]>([])
  const lastSeenTs = useRef<number>(Date.now()) // เริ่มนับจากตอนนี้ — ไม่เด้งย้อนหลังเหตุการณ์เก่า

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  useEffect(() => {
    lastSeenTs.current = Date.now() // เปลี่ยนห้อง — รีเซ็ตจุดเริ่มนับใหม่ กันเหตุการณ์เก่าของห้องใหม่เด้งรัว
  }, [selectedRoom?.id])

  useEffect(() => {
    if (!token || !selectedRoom?.id) return
    const deviceId = selectedRoom.id
    const roomName = roomDisplayName(selectedRoom)

    const poll = async () => {
      if (localStorage.getItem(NOTIF_KEY) === 'false') return
      try {
        const now = Date.now()
        const evs = await tbGetEvents(token, deviceId, lastSeenTs.current + 1, now)
        if (evs.length > 0) {
          lastSeenTs.current = Math.max(...evs.map((e) => e.ts))
          for (const ev of evs.slice(0, 3)) {
            // จำกัดไม่เกิน 3 แบนเนอร์ต่อรอบ poll กันจอแตกถ้ามีเหตุการณ์มาพร้อมกันหลายอัน
            const { title, body } = describeEvent(ev)
            const id = nextId++
            setItems((prev) => [...prev, { id, title: `${roomName}: ${title}`, body }])
            setTimeout(() => dismiss(id), 6000)
          }
        } else {
          lastSeenTs.current = now
        }
      } catch {
        // เน็ตหลุด/โทเค็นหมดอายุชั่วคราว — ข้ามรอบนี้ไป ไม่ต้องแจ้ง error ซ้ำกับ hook อื่น
      }
    }

    const timer = setInterval(poll, POLL_MS)
    return () => clearInterval(timer)
  }, [token, selectedRoom, dismiss])

  const value = useMemo(() => ({ items, dismiss }), [items, dismiss])

  return <PushContext.Provider value={value}>{children}</PushContext.Provider>
}

export function usePushNotifications(): PushContextValue {
  const ctx = useContext(PushContext)
  if (!ctx) throw new Error('usePushNotifications ต้องถูกใช้ภายใน PushNotificationProvider')
  return ctx
}
