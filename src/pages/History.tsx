import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { roomDisplayName, useRooms } from '../context/RoomContext'
import { tbGetEvents, tbGetHistory } from '../lib/tb'
import { apiErrorText } from '../lib/apiError'
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews'
import LineChart from '../components/LineChart'
import RoomSelect from '../components/RoomSelect'
import { Icon } from '../components/IconSprite'
import type { AcEvent } from '../types'

const RANGES = [
  { h: 6, label: '6 ชม.' },
  { h: 24, label: '24 ชม.' },
  { h: 168, label: '7 วัน' },
] as const

// SC-M08 — ประวัติ + กราฟ + ส่งออก CSV
export default function History() {
  const { token } = useAuth()
  const { selectedRoom } = useRooms()
  const deviceId = selectedRoom?.id ?? null
  const [hours, setHours] = useState<number>(24)
  const [points, setPoints] = useState<{ ts: number; value: number }[]>([])
  const [events, setEvents] = useState<AcEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token || !deviceId) return
    setLoading(true)
    setError(null)
    const endTs = Date.now()
    const startTs = endTs - hours * 60 * 60 * 1000
    try {
      const [hist, evs] = await Promise.all([
        tbGetHistory(token, deviceId, ['temp'], startTs, endTs),
        tbGetEvents(token, deviceId, startTs, endTs),
      ])
      setPoints((hist.temp ?? []).map((e) => ({ ts: e.ts, value: Number(e.value) })).reverse())
      setEvents(evs)
    } catch (err) {
      setError(apiErrorText(err))
    } finally {
      setLoading(false)
    }
  }, [token, deviceId, hours])

  useEffect(() => {
    load()
  }, [load])

  function exportCsv() {
    const header = 'เวลา,อุณหภูมิ\n'
    const rows = points.map((p) => `${new Date(p.ts).toISOString()},${p.value}`).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `history-${deviceId}-${hours}h.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="page" data-screen="SC-M08">
      <header className="page-header">
        <span className="header-spacer" />
        <h2 className="page-title">ประวัติ</h2>
        <span className="header-action">
          <button type="button" className="btn-icon" aria-label="ส่งออก CSV" disabled={points.length === 0} onClick={exportCsv}>
            <Icon name="share" />
          </button>
        </span>
      </header>

      <RoomSelect />

      <div className="chart-tabs" role="group" aria-label="ช่วงเวลา">
        {RANGES.map((r) => (
          <button key={r.h} type="button" className={hours === r.h ? 'sel' : ''} onClick={() => setHours(r.h)}>
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingView />
      ) : error ? (
        <ErrorView text={error} onRetry={load} />
      ) : (
        <div className="card chart">
          <div className="chart-head">
            <span>
              <i className="teal-dot" />
              อุณหภูมิ
            </span>
            <b>{roomDisplayName(selectedRoom)}</b>
          </div>
          {points.length === 0 ? (
            <p className="chart-empty">ยังไม่มีข้อมูลอุณหภูมิในช่วงนี้</p>
          ) : (
            <LineChart points={points} />
          )}
        </div>
      )}

      <div className="section-title">
        <strong>เหตุการณ์ล่าสุด</strong>
        <span>{events.length} รายการ</span>
      </div>
      {events.length === 0 ? (
        <EmptyView text="ยังไม่มีเหตุการณ์ในช่วงนี้" />
      ) : (
        <ul className="event-rows">
          {events.map((ev) => (
            <li key={ev.ts} className="event-row">
              <time>{new Date(ev.ts).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</time>
              <span>
                <b>{ev.ac_command ?? '—'}</b>
                <small>{ev.source ?? ''}</small>
              </span>
              {ev.reason && <small>{ev.reason}</small>}
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="btn-secondary export-btn" disabled={points.length === 0} onClick={exportCsv}>
        <Icon name="share" />
        ส่งออก CSV
      </button>
    </section>
  )
}
