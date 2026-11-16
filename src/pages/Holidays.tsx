import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRooms } from '../context/RoomContext'
import { useTelemetry } from '../hooks/useTelemetry'
import { useRpc } from '../hooks/useRpc'
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews'
import RoomSelect from '../components/RoomSelect'
import { Icon } from '../components/IconSprite'

// SC-M07 — วันหยุด
export default function Holidays() {
  const { role } = useAuth()
  const { selectedRoom } = useRooms()
  const deviceId = selectedRoom?.id ?? null
  const { holidays, active, loading, error, refresh } = useTelemetry(deviceId)
  const { send, sending } = useRpc(deviceId)
  const isAdmin = role === 'ADMIN'
  const offline = active === false
  const [newDate, setNewDate] = useState('')

  async function addHoliday() {
    if (!newDate) return
    await send('addHoliday', { date: newDate })
    setNewDate('')
    refresh()
  }

  async function removeHoliday(date: string) {
    await send('removeHoliday', { date })
    refresh()
  }

  return (
    <section className="page" data-screen="SC-M07">
      <header className="page-header">
        <span className="header-spacer" />
        <h2 className="page-title">ตาราง</h2>
        <span className="header-action" />
      </header>

      <RoomSelect />

      <nav className="top-segment" aria-label="ตาราง">
        <NavLink to="/schedule">ตารางเรียน</NavLink>
        <NavLink to="/holidays" aria-current="page">
          วันหยุด
        </NavLink>
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

      {isAdmin && (
        <div className="sheet-form" style={{ display: 'flex', flexDirection: 'row', gap: 8, paddingTop: 0 }}>
          <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <button type="button" disabled={!newDate || sending} onClick={addHoliday}>
            เพิ่ม
          </button>
        </div>
      )}

      {loading && !holidays ? (
        <LoadingView />
      ) : error && !holidays ? (
        <ErrorView text={error} onRetry={refresh} />
      ) : (
        <>
          <div className="section-title">
            <strong>วันหยุดที่กำหนด</strong>
            <span>{holidays?.length ?? 0} วัน</span>
          </div>
          {!holidays || holidays.length === 0 ? (
            <EmptyView text="ยังไม่มีวันหยุด" />
          ) : (
            <ul className="holiday-rows">
              {holidays.map((d) => (
                <li key={d} className="holiday-row">
                  <div className="date-box">
                    <b>{d.slice(8, 10)}</b>
                    <span>{d.slice(0, 7)}</span>
                  </div>
                  <span>
                    <b>{d}</b>
                  </span>
                  {isAdmin && (
                    <button type="button" aria-label="ลบ" disabled={sending} onClick={() => removeHoliday(d)}>
                      <Icon name="x" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
