import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRooms } from '../context/RoomContext'
import { useTelemetry } from '../hooks/useTelemetry'
import { useRpc } from '../hooks/useRpc'
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews'
import RoomSelect from '../components/RoomSelect'
import { Icon } from '../components/IconSprite'
import { DAY_NAMES, minutesToTime, timeToMinutes } from '../lib/time'
import type { ScheduleSlot } from '../types'

// SC-M06 — ตารางเรียน (2 ช่วง/วัน)
export default function Schedule() {
  const { role } = useAuth()
  const { selectedRoom } = useRooms()
  const deviceId = selectedRoom?.id ?? null
  const { schedule, active, loading, error, refresh } = useTelemetry(deviceId)
  const { send, sending } = useRpc(deviceId)
  const isAdmin = role === 'ADMIN'
  const offline = active === false

  async function updateSlot(day: number, slot: number, patch: Partial<ScheduleSlot>) {
    const current = schedule![day][slot]
    const next = { ...current, ...patch }
    if (next.s >= next.e) return // UI ต้องกันค่าผิดเองก่อนส่ง (SPEC.md ข้อ 3)
    await send('setSchedule', { day, slot, en: next.en, start: next.s, end: next.e })
    refresh()
  }

  return (
    <section className="page" data-screen="SC-M06">
      <header className="page-header">
        <span className="header-spacer" />
        <h2 className="page-title">ตาราง</h2>
        <span className="header-action" />
      </header>

      <RoomSelect />

      <nav className="top-segment" aria-label="ตาราง">
        <NavLink to="/schedule" aria-current="page">
          ตารางเรียน
        </NavLink>
        <NavLink to="/holidays">วันหยุด</NavLink>
      </nav>

      {!isAdmin && (
        <p className="readonly">
          <Icon name="lock" />
          เฉพาะผู้ดูแลที่แก้ไขได้
        </p>
      )}

      {offline && (
        <div className="offline-banner" role="alert">
          <Icon name="wifi" />
          <span>
            <b>อุปกรณ์ออฟไลน์</b>สั่งงานไม่ได้
          </span>
        </div>
      )}

      {loading && !schedule ? (
        <LoadingView />
      ) : error && !schedule ? (
        <ErrorView text={error} onRetry={refresh} />
      ) : !schedule ? (
        <EmptyView text="ยังไม่มีตารางเรียน" />
      ) : (
        <div id="schedDays">
          {DAY_NAMES.map((dayName, day) => (
            <div key={day} className="class-card" style={{ display: 'block' }}>
              <strong>{dayName}</strong>
              {schedule[day].map((slot, slotIdx) => (
                <div key={slotIdx} className="class-time" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, border: 'none' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="checkbox"
                      disabled={!isAdmin || sending}
                      checked={slot.en}
                      onChange={(e) => updateSlot(day, slotIdx, { en: e.target.checked })}
                    />
                    ช่วงที่ {slotIdx + 1}
                  </label>
                  <input
                    type="time"
                    disabled={!isAdmin || sending}
                    value={minutesToTime(slot.s)}
                    onChange={(e) => updateSlot(day, slotIdx, { s: timeToMinutes(e.target.value) })}
                  />
                  <span>ถึง</span>
                  <input
                    type="time"
                    disabled={!isAdmin || sending}
                    value={minutesToTime(slot.e)}
                    onChange={(e) => updateSlot(day, slotIdx, { e: timeToMinutes(e.target.value) })}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
