import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRooms } from '../context/RoomContext'
import { useTelemetry } from '../hooks/useTelemetry'
import { useRpc } from '../hooks/useRpc'
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews'
import RoomSelect from '../components/RoomSelect'
import BottomSheet from '../components/BottomSheet'
import { Icon } from '../components/IconSprite'
import { DAY_SHORT, minutesToTime, timeToMinutes, epochDayToDate } from '../lib/time'
import type { SchedulePeriod } from '../types'

const MAX_PER_DAY = 50

interface FormState {
  id: number | null // null = เพิ่มใหม่
  day: number
  name: string
  start: string
  end: string
  validFrom: string
  validTo: string
}

function emptyForm(day: number): FormState {
  return { id: null, day, name: '', start: '09:00', end: '12:00', validFrom: '', validTo: '' }
}

// SC-M06 — ตารางเรียน (คาบเรียนแบบมีชื่อ + ช่วงวันที่มีผล, สูงสุด 50 คาบ/วัน)
export default function Schedule() {
  const { role } = useAuth()
  const { selectedRoom } = useRooms()
  const deviceId = selectedRoom?.id ?? null
  const { schedule, active, loading, error, refresh } = useTelemetry(deviceId)
  const { send, sending } = useRpc(deviceId)
  const isAdmin = role === 'ADMIN'
  const offline = active === false

  const [day, setDay] = useState(0)
  const [form, setForm] = useState<FormState | null>(null)

  const periodsForDay = useMemo(
    () => (schedule ?? []).filter((p) => p.day === day).sort((a, b) => a.startMin - b.startMin),
    [schedule, day],
  )

  function openAdd() {
    setForm(emptyForm(day))
  }

  function openEdit(p: SchedulePeriod) {
    setForm({
      id: p.id,
      day: p.day,
      name: p.name,
      start: minutesToTime(p.startMin),
      end: minutesToTime(p.endMin),
      validFrom: epochDayToDate(p.validFromDay),
      validTo: epochDayToDate(p.validToDay),
    })
  }

  async function saveForm() {
    if (!form) return
    const start = timeToMinutes(form.start)
    const end = timeToMinutes(form.end)
    if (start >= end) return
    const params = {
      id: form.id ?? undefined,
      day: form.day,
      start,
      end,
      validFrom: form.validFrom,
      validTo: form.validTo,
      enabled: true,
      name: form.name,
    }
    await send(form.id ? 'scheduleEdit' : 'scheduleAdd', params)
    setForm(null)
    refresh()
  }

  async function deletePeriod(id: number) {
    await send('scheduleDelete', { id })
    refresh()
  }

  function validRangeText(p: SchedulePeriod): string | null {
    if (!p.validFromDay && !p.validToDay) return null
    const from = p.validFromDay ? epochDayToDate(p.validFromDay) : '…'
    const to = p.validToDay ? epochDayToDate(p.validToDay) : '…'
    return `มีผล ${from} – ${to}`
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

      <div className="day-pill-row" role="tablist" aria-label="เลือกวัน">
        {DAY_SHORT.map((label, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={day === i}
            className={`day-pill${day === i ? ' sel' : ''}`}
            onClick={() => setDay(i)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && !schedule ? (
        <LoadingView />
      ) : error && !schedule ? (
        <ErrorView text={error} onRetry={refresh} />
      ) : (
        <>
          <div className="section-title">
            <strong>วัน{['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'][day]}</strong>
            <span>
              ใช้ไป {periodsForDay.length}/{MAX_PER_DAY} รายการ
            </span>
          </div>

          {periodsForDay.length === 0 ? (
            <EmptyView text="ยังไม่มีคาบเรียนวันนี้" />
          ) : (
            <ul className="period-list">
              {periodsForDay.map((p) => (
                <li key={p.id} className="period-card">
                  <div className="period-card-main">
                    <span className="period-time">
                      {minutesToTime(p.startMin)}–{minutesToTime(p.endMin)}
                    </span>
                    <strong>{p.name || 'ไม่มีชื่อ'}</strong>
                    {validRangeText(p) && <p className="period-valid">{validRangeText(p)}</p>}
                  </div>
                  {isAdmin && (
                    <div className="period-card-actions">
                      <button type="button" aria-label="แก้ไข" disabled={sending} onClick={() => openEdit(p)}>
                        <Icon name="pencil" />
                      </button>
                      <button type="button" aria-label="ลบ" className="danger" disabled={sending} onClick={() => deletePeriod(p.id)}>
                        <Icon name="trash" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {isAdmin && (
        <button type="button" className="fab" aria-label="เพิ่มคาบเรียน" disabled={sending || periodsForDay.length >= MAX_PER_DAY} onClick={openAdd}>
          <Icon name="plus" />
        </button>
      )}

      <BottomSheet open={form !== null} title={form?.id ? 'แก้ไขคาบเรียน' : 'เพิ่มคาบเรียน'} onClose={() => setForm(null)}>
        {form && (
          <div className="sheet-form">
            <div className="sheet-field">
              <label htmlFor="pName">ชื่อคาบ</label>
              <input id="pName" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น การเรียนการสอนช่วงเช้า" />
            </div>
            <div className="sheet-field">
              <label htmlFor="pDay">วัน</label>
              <select id="pDay" value={form.day} onChange={(e) => setForm({ ...form, day: Number(e.target.value) })}>
                {['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'].map((d, i) => (
                  <option key={i} value={i}>
                    วัน{d}
                  </option>
                ))}
              </select>
            </div>
            <div className="ctl-actions">
              <div className="sheet-field">
                <label htmlFor="pStart">เวลาเริ่ม</label>
                <input id="pStart" type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
              </div>
              <div className="sheet-field">
                <label htmlFor="pEnd">เวลาสิ้นสุด</label>
                <input id="pEnd" type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
              </div>
            </div>
            <div className="ctl-actions">
              <div className="sheet-field">
                <label htmlFor="pFrom">มีผลตั้งแต่ (ไม่ใส่ = ไม่จำกัด)</label>
                <input id="pFrom" type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
              </div>
              <div className="sheet-field">
                <label htmlFor="pTo">มีผลถึง (ไม่ใส่ = ไม่จำกัด)</label>
                <input id="pTo" type="date" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />
              </div>
            </div>
            <span className="error">{timeToMinutes(form.start) >= timeToMinutes(form.end) ? 'เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด' : ''}</span>
            <button type="button" className="primary" disabled={sending || timeToMinutes(form.start) >= timeToMinutes(form.end)} onClick={saveForm}>
              บันทึก
            </button>
          </div>
        )}
      </BottomSheet>
    </section>
  )
}
