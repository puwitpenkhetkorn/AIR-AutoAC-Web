import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRooms } from '../context/RoomContext'
import { useTelemetry } from '../hooks/useTelemetry'
import { useRpc } from '../hooks/useRpc'
import { ErrorView, LoadingView } from '../components/StateViews'
import RoomSelect from '../components/RoomSelect'
import { Icon } from '../components/IconSprite'

const WEEKDAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// SC-M07 — วันหยุด (ปฏิทินรายเดือน)
export default function Holidays() {
  const { role } = useAuth()
  const { selectedRoom } = useRooms()
  const deviceId = selectedRoom?.id ?? null
  const { holidays, active, loading, error, refresh } = useTelemetry(deviceId)
  const { send, sending } = useRpc(deviceId)
  const isAdmin = role === 'ADMIN'
  const offline = active === false
  const [newDate, setNewDate] = useState('')

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth()) // 0-11

  const holidaySet = useMemo(() => new Set(holidays ?? []), [holidays])

  const weeks = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay() // 0=อา
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const cells: (number | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    const rows: (number | null)[][] = []
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
    return rows
  }, [viewYear, viewMonth])

  const holidaysThisMonth = useMemo(
    () =>
      (holidays ?? [])
        .filter((d) => d.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`))
        .sort(),
    [holidays, viewYear, viewMonth],
  )

  function changeMonth(delta: number) {
    let m = viewMonth + delta
    let y = viewYear
    if (m < 0) { m = 11; y -= 1 }
    if (m > 11) { m = 0; y += 1 }
    setViewMonth(m)
    setViewYear(y)
  }

  async function toggleDate(d: number) {
    if (!isAdmin) return
    const date = ymd(viewYear, viewMonth, d)
    if (holidaySet.has(date)) await send('removeHoliday', { date })
    else await send('addHoliday', { date })
    refresh()
  }

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

      {loading && !holidays ? (
        <LoadingView />
      ) : error && !holidays ? (
        <ErrorView text={error} onRetry={refresh} />
      ) : (
        <div className="card holiday-calendar">
          <div className="cal-head">
            <button type="button" aria-label="เดือนก่อนหน้า" onClick={() => changeMonth(-1)}>
              <Icon name="chev-left" />
            </button>
            <strong>
              {MONTH_NAMES[viewMonth]} {viewYear + 543}
            </strong>
            <button type="button" aria-label="เดือนถัดไป" onClick={() => changeMonth(1)}>
              <Icon name="chevron-right" />
            </button>
          </div>

          <div className="cal-weekdays">
            {WEEKDAY_LABELS.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>

          <div className="cal-grid">
            {weeks.map((row, ri) =>
              row.map((d, ci) => {
                if (d === null) return <span key={`${ri}-${ci}`} className="cal-cell empty" />
                const date = ymd(viewYear, viewMonth, d)
                const isHoliday = holidaySet.has(date)
                return (
                  <button
                    key={date}
                    type="button"
                    className={`cal-cell${isHoliday ? ' holiday' : ''}`}
                    disabled={!isAdmin || sending}
                    onClick={() => toggleDate(d)}
                  >
                    <span className="cal-day-num">{d}</span>
                    {isHoliday && <span className="cal-dot" />}
                  </button>
                )
              }),
            )}
          </div>

          <div className="cal-list">
            {holidaysThisMonth.length === 0 ? (
              <p className="period-valid">ไม่มีวันหยุดในเดือนนี้</p>
            ) : (
              holidaysThisMonth.map((d) => (
                <div key={d} className="cal-list-row">
                  <span className="cal-dot" />
                  <div>
                    <b>{Number(d.slice(8, 10))} {MONTH_NAMES[viewMonth]}</b>
                  </div>
                  {isAdmin && (
                    <button type="button" aria-label="ลบ" disabled={sending} onClick={() => removeHoliday(d)}>
                      <Icon name="x" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="sheet-form" style={{ display: 'flex', flexDirection: 'row', gap: 8, paddingTop: 12 }}>
          <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <button type="button" className="btn-secondary" disabled={!newDate || sending} onClick={addHoliday}>
            เพิ่มวันที่
          </button>
        </div>
      )}
    </section>
  )
}
