import { useState } from 'react'
import { roomDisplayName, useRooms } from '../context/RoomContext'
import { Icon } from './IconSprite'
import BottomSheet from './BottomSheet'

// ปุ่ม "เลือกห้อง" (Figma .room-select) — หลายห้องสลับได้ ห้องเดียว/อ่านไม่ได้แสดงชื่ออย่างเดียว (SPEC.md ข้อ 7)
export default function RoomSelect() {
  const { rooms, selectedRoom, selectRoom } = useRooms()
  const [open, setOpen] = useState(false)
  const canSwitch = rooms.length > 1

  return (
    <>
      <button
        className={`room-select${canSwitch ? '' : ' single'}`}
        type="button"
        onClick={() => canSwitch && setOpen(true)}
      >
        <span>
          <Icon name="airvent" />
          <span>{roomDisplayName(selectedRoom)}</span>
        </span>
        <Icon name="chevron-down" />
      </button>

      <BottomSheet open={open} title="เลือกห้อง" onClose={() => setOpen(false)}>
        <div className="picker-list">
          {rooms.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-current={r.id === selectedRoom?.id}
              onClick={() => {
                selectRoom(r.id)
                setOpen(false)
              }}
            >
              <span>
                <Icon name="airvent" />
                {roomDisplayName(r)}
              </span>
              {r.active === false && <span className="badge red">ออฟไลน์</span>}
            </button>
          ))}
        </div>
      </BottomSheet>
    </>
  )
}
