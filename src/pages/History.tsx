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

const SD_ADDR_KEY = 'air.sdlog.address'

// วันที่ (YYYYMMDD) ทุกวันที่ครอบคลุมช่วง [startTs, endTs] — ใช้หาไฟล์ sensor_*.csv/event_*.csv ที่ต้องดึงจาก SD
function datesInRange(startTs: number, endTs: number): string[] {
  const out: string[] = []
  const d = new Date(startTs)
  d.setHours(0, 0, 0, 0)
  while (d.getTime() <= endTs) {
    out.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`)
    d.setDate(d.getDate() + 1)
  }
  return out
}

// เวลาในไฟล์ CSV เป็น "YYYY-MM-DD HH:MM:SS" เวลาท้องถิ่น (ดู log_sd.cpp isoTimestamp) — เติม T ให้ Date parse เป็น local time
function parseCsvTs(ts: string): number {
  return new Date(ts.replace(' ', 'T')).getTime()
}

async function fetchSdFiles(addr: string): Promise<string[]> {
  const res = await fetch(`http://${addr}/api/files`, { signal: AbortSignal.timeout(3000) })
  if (!res.ok) throw new Error('sd files fetch failed')
  return res.json()
}

async function fetchSdCsv(addr: string, name: string): Promise<string> {
  const res = await fetch(`http://${addr}/api/csv?name=${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(3000) })
  if (!res.ok) throw new Error('sd csv fetch failed')
  return res.text()
}

function parseSensorCsv(csv: string, startTs: number, endTs: number): { ts: number; value: number }[] {
  const lines = csv.trim().split('\n')
  const out: { ts: number; value: number }[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length < 2) continue
    const ts = parseCsvTs(cols[0])
    if (ts < startTs || ts > endTs) continue
    out.push({ ts, value: Number(cols[1]) }) // cols[1] = temp
  }
  return out
}

function parseEventCsv(csv: string, startTs: number, endTs: number): AcEvent[] {
  const lines = csv.trim().split('\n')
  const out: AcEvent[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length < 3) continue
    const ts = parseCsvTs(cols[0])
    if (ts < startTs || ts > endTs) continue
    out.push({ ts, ac_command: cols[1], source: cols[2], reason: cols[3] ?? '' })
  }
  return out
}

// SC-M08 — ประวัติ + กราฟ + ส่งออก CSV (รวมข้อมูลจาก ThingsBoard + microSD ของบอร์ด ถ้าอยู่ในวง LAN เดียวกัน)
export default function History() {
  const { token } = useAuth()
  const { selectedRoom } = useRooms()
  const deviceId = selectedRoom?.id ?? null
  const [hours, setHours] = useState<number>(24)
  const [points, setPoints] = useState<{ ts: number; value: number }[]>([])
  const [events, setEvents] = useState<AcEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sdStatus, setSdStatus] = useState<'idle' | 'ok' | 'unreachable'>('idle')

  const load = useCallback(async () => {
    if (!token || !deviceId) return
    setLoading(true)
    setError(null)
    setSdStatus('idle')
    const endTs = Date.now()
    const startTs = endTs - hours * 60 * 60 * 1000
    let tbPoints: { ts: number; value: number }[] = []
    let tbEvents: AcEvent[] = []
    try {
      const [hist, evs] = await Promise.all([
        tbGetHistory(token, deviceId, ['temp'], startTs, endTs),
        tbGetEvents(token, deviceId, startTs, endTs),
      ])
      tbPoints = (hist.temp ?? []).map((e) => ({ ts: e.ts, value: Number(e.value) })).reverse()
      tbEvents = evs
    } catch (err) {
      setError(apiErrorText(err))
      setLoading(false)
      return
    }

    // SD การ์ดบนบอร์ด — มี log ละเอียดกว่า (ทุก 1 นาที) เสริมจาก ThingsBoard (ส่งทุก 30 วิแต่ ThingsBoard อาจ downsample เวลาเก็บนาน)
    // ใช้ได้เฉพาะตอนเครื่องที่เปิดเว็บอยู่ใน WiFi เดียวกับบอร์ดเท่านั้น — fetch ไม่ได้ก็แค่ไม่เสริม ไม่ error หลัก
    let sdPoints: { ts: number; value: number }[] = []
    let sdEvents: AcEvent[] = []
    try {
      const addr = localStorage.getItem(SD_ADDR_KEY) || 'autoac.local'
      const files = await fetchSdFiles(addr)
      const dates = new Set(datesInRange(startTs, endTs))
      const wanted = files.filter((f) => dates.has(f.slice(f.indexOf('_') + 1, f.indexOf('.'))))
      const csvs = await Promise.all(wanted.map((f) => fetchSdCsv(addr, f).then((csv) => ({ name: f, csv }))))
      for (const { name, csv } of csvs) {
        if (name.startsWith('sensor_')) sdPoints.push(...parseSensorCsv(csv, startTs, endTs))
        else if (name.startsWith('event_')) sdEvents.push(...parseEventCsv(csv, startTs, endTs))
      }
      setSdStatus('ok')
    } catch {
      setSdStatus('unreachable')
    }

    // รวม + เรียงตามเวลา + ตัดซ้ำ (เผื่อ ThingsBoard กับ SD มีจุดเวลาเดียวกัน)
    const mergedPoints = [...tbPoints, ...sdPoints].sort((a, b) => a.ts - b.ts)
    const seenP = new Set<number>()
    setPoints(mergedPoints.filter((p) => (seenP.has(p.ts) ? false : (seenP.add(p.ts), true))))

    const mergedEvents = [...tbEvents, ...sdEvents].sort((a, b) => b.ts - a.ts)
    const seenE = new Set<number>()
    setEvents(mergedEvents.filter((e) => (seenE.has(e.ts) ? false : (seenE.add(e.ts), true))))

    setLoading(false)
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

      {sdStatus === 'ok' && <p className="sd-status ok">เสริมข้อมูลจาก microSD บนบอร์ดแล้ว</p>}
      {sdStatus === 'unreachable' && <p className="sd-status warn">ดึงข้อมูลจาก microSD บนบอร์ดไม่ได้ (ต้องอยู่ใน WiFi เดียวกับบอร์ด) — แสดงเฉพาะข้อมูลจาก ThingsBoard</p>}

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
