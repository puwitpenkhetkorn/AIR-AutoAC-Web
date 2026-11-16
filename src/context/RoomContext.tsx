import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { tbGetCustomerDeviceInfos, tbGetTenantDevices } from '../lib/tb'
import type { DeviceInfo } from '../types'

interface RoomContextValue {
  rooms: DeviceInfo[]
  roomsError: string | null
  roomsLoading: boolean
  selectedRoomId: string | null
  selectedRoom: DeviceInfo | null
  selectRoom: (id: string) => void
  reload: () => void
}

const RoomContext = createContext<RoomContextValue | null>(null)

const SELECTED_KEY = 'autoac_selected_room'

export function RoomProvider({ children }: { children: ReactNode }) {
  const { token, role, customerId, userId } = useAuth()
  const [rooms, setRooms] = useState<DeviceInfo[]>([])
  const [roomsError, setRoomsError] = useState<string | null>(null)
  const [roomsLoading, setRoomsLoading] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!token || !userId) return
    setRoomsLoading(true)
    setRoomsError(null)
    const promise =
      role === 'ADMIN'
        ? tbGetTenantDevices(token)
        : customerId
          ? tbGetCustomerDeviceInfos(token, customerId)
          : Promise.resolve<DeviceInfo[]>([])

    promise
      .then((list) => {
        setRooms(list)
        setSelectedRoomId((prev) => {
          if (prev && list.some((r) => r.id === prev)) return prev
          const saved = sessionStorage.getItem(SELECTED_KEY)
          if (saved && list.some((r) => r.id === saved)) return saved
          return list[0]?.id ?? null
        })
      })
      .catch(() => {
        setRoomsError('โหลดรายการห้องไม่สำเร็จ ลองใหม่อีกครั้ง')
      })
      .finally(() => setRoomsLoading(false))
  }, [token, role, customerId, userId])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userId])

  const selectRoom = useCallback((id: string) => {
    setSelectedRoomId(id)
    sessionStorage.setItem(SELECTED_KEY, id)
  }, [])

  const selectedRoom = useMemo(() => rooms.find((r) => r.id === selectedRoomId) ?? null, [rooms, selectedRoomId])

  const value = useMemo<RoomContextValue>(
    () => ({ rooms, roomsError, roomsLoading, selectedRoomId, selectedRoom, selectRoom, reload: load }),
    [rooms, roomsError, roomsLoading, selectedRoomId, selectedRoom, selectRoom, load],
  )

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>
}

export function useRooms(): RoomContextValue {
  const ctx = useContext(RoomContext)
  if (!ctx) throw new Error('useRooms ต้องถูกใช้ภายใน RoomProvider')
  return ctx
}

/** ชื่อห้อง = Label ของ device ถ้าว่างใช้ Name (D-16) ไม่มีชื่อเลย = "ห้องเรียน" */
export function roomDisplayName(room: DeviceInfo | null | undefined): string {
  if (!room) return 'ห้องเรียน'
  return room.label?.trim() || room.name?.trim() || 'ห้องเรียน'
}
