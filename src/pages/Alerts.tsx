import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRooms } from '../context/RoomContext'
import { tbGetEvents } from '../lib/tb'
import { apiErrorText } from '../lib/apiError'
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews'
import { Icon } from '../components/IconSprite'
import type { AcEvent } from '../types'

const NOTIF_KEY = 'autoac_notif_enabled'

// SC-M10 — การแจ้งเตือน (สร้างจาก ac_command/source/reason — D-10)
export default function Alerts() {
  const { token } = useAuth()
  const { selectedRoom } = useRooms()
  const deviceId = selectedRoom?.id ?? null
  const [events, setEvents] = useState<AcEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(() => localStorage.getItem(NOTIF_KEY) !== 'false')

  const load = useCallback(async () => {
    if (!token || !deviceId) return
    setLoading(true)
    setError(null)
    const endTs = Date.now()
    const startTs = endTs - 24 * 60 * 60 * 1000
    try {
      const evs = await tbGetEvents(token, deviceId, startTs, endTs)
      setEvents(evs)
    } catch (err) {
      setError(apiErrorText(err))
    } finally {
      setLoading(false)
    }
  }, [token, deviceId])

  useEffect(() => {
    load()
  }, [load])

  function toggleEnabled(next: boolean) {
    setEnabled(next)
    localStorage.setItem(NOTIF_KEY, String(next))
  }

  return (
    <section className="page" data-screen="SC-M10">
      <header className="page-header">
        <Link className="btn-icon" to="/room" aria-label="กลับ">
          <Icon name="arrow-left" />
        </Link>
        <h2 className="page-title">การแจ้งเตือน</h2>
        <span className="header-action" />
      </header>

      {loading ? (
        <LoadingView />
      ) : error ? (
        <ErrorView text={error} onRetry={load} />
      ) : events.length === 0 ? (
        <EmptyView text="ยังไม่มีการแจ้งเตือน" />
      ) : (
        <ul className="notif-list event-rows">
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

      <h3 className="section-caption">แจ้งเตือนเมื่อ</h3>
      <p className="notif-hint">เลือกว่าจะแสดงการแจ้งเตือนในแอปนี้หรือไม่ — ตั้งไว้เฉพาะเครื่องนี้</p>
      <div className="card">
        <div className="settings-row">
          <span>
            <Icon name="bell" />
            เปิดการแจ้งเตือนในแอป
          </span>
          <button
            type="button"
            className="toggle"
            role="switch"
            aria-checked={enabled}
            onClick={() => toggleEnabled(!enabled)}
          >
            <span />
          </button>
        </div>
      </div>
    </section>
  )
}
