import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { roomDisplayName, useRooms } from '../context/RoomContext'
import { useTelemetry } from '../hooks/useTelemetry'
import { useRpc } from '../hooks/useRpc'
import { ErrorView, LoadingView } from '../components/StateViews'
import RoomSelect from '../components/RoomSelect'
import { Icon } from '../components/IconSprite'
import SensorPanel from '../components/SensorPanel'
import { AC_FANS, AC_MODES, TEMP_MAX, TEMP_MIN } from '../config'

const TODAY = new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })

// SC-M04 — รายละเอียดห้อง (รวมส่วนควบคุมแอร์แล้ว, เดิม SC-M05 — D-11)
export default function Room() {
  const { selectedRoom } = useRooms()
  const deviceId = selectedRoom?.id ?? null
  const { telemetry, settings, active, stale, loading, error, refresh } = useTelemetry(deviceId)
  const learnedMode = settings?.irMode === 'learned'
  const { send, sending } = useRpc(deviceId)
  const [localSetTemp, setLocalSetTemp] = useState<number | null>(null)

  const offline = active === false
  const setTemp = localSetTemp ?? telemetry?.ac_set_temp ?? 24
  const disabled = offline || sending

  // มือถือ/เว็บวิวบางตัวยิง event แตะ 1 ครั้งเป็น click มากกว่า 1 ครั้ง (ซ้อนกันในจังหวะเดียว ก่อน React re-render ทัน
  // ทำให้ disabled ยังไม่ทันอัปเดต) — กันด้วย ref แบบ synchronous แทนพึ่ง state/disabled อย่างเดียว
  const adjustingRef = useRef(false)
  async function adjustTemp(delta: number) {
    if (adjustingRef.current) return
    adjustingRef.current = true
    try {
      const next = Math.min(TEMP_MAX, Math.max(TEMP_MIN, setTemp + delta))
      setLocalSetTemp(next)
      await send('temp', next)
    } finally {
      adjustingRef.current = false
    }
  }

  async function setPower(on: boolean) {
    await send(on ? 'on' : 'off')
  }

  const [calibrateInput, setCalibrateInput] = useState('')

  async function calibrateTemp() {
    const v = Number(calibrateInput)
    if (!Number.isFinite(v) || v < TEMP_MIN || v > TEMP_MAX) return
    await send('setSetting', { key: 'calibrateTemp', value: v })
    setLocalSetTemp(v)
    setCalibrateInput('')
  }

  return (
    <section className="page" data-screen="SC-M04">
      <div className="home-head">
        <div>
          <p className="eyebrow">{TODAY}</p>
          <h2 className="page-title home-title">{roomDisplayName(selectedRoom)}</h2>
        </div>
        <Link className="bell-button" to="/alerts" aria-label="การแจ้งเตือน">
          <Icon name="bell" />
        </Link>
      </div>

      <RoomSelect />

      <div className="detail-meta">
        {!loading && !error && (
          <p className={`fresh${stale ? ' stale' : ''}`}>{stale ? 'ข้อมูลล้าสมัย' : 'อัปเดตล่าสุดเมื่อสักครู่'}</p>
        )}
        {active !== undefined && <span className={`badge ${active ? 'green' : 'red'}`}>{active ? 'ออนไลน์' : 'ออฟไลน์'}</span>}
      </div>

      {offline && (
        <div className="offline-banner" role="alert">
          <Icon name="wifi" />
          <span>
            <b>อุปกรณ์ออฟไลน์</b>สั่งงานไม่ได้
          </span>
        </div>
      )}

      {loading && !telemetry ? (
        <LoadingView />
      ) : error && !telemetry ? (
        <ErrorView text={error} onRetry={refresh} />
      ) : (
        <div className="climate-card">
          <div className="temp-ring">
            <div>
              <Icon name="thermo" />
              <strong>{telemetry?.temp !== undefined ? `${telemetry.temp.toFixed(1)}°` : '--°'}</strong>
              <span>อุณหภูมิห้อง</span>
            </div>
          </div>
          <div className="climate-side">
            <div>
              <Icon name="droplets" />
              <span>
                <b>{telemetry?.humidity !== undefined ? `${telemetry.humidity.toFixed(0)}%` : '--%'}</b>ความชื้น
              </span>
            </div>
            <div>
              <Icon name="users" />
              <span>
                <b>{telemetry?.occupied === undefined ? '—' : telemetry.occupied ? 'มี' : 'ไม่มี'}</b>ในห้อง
              </span>
            </div>
          </div>
        </div>
      )}

      <h3 className="section-caption">ควบคุมแอร์</h3>
      <div className={`control-surface${disabled ? ' disabled' : ''}`}>
        <button
          type="button"
          className={`power-button${telemetry?.ac_on ? ' on' : ''}`}
          aria-pressed={Boolean(telemetry?.ac_on)}
          aria-label={telemetry?.ac_on ? 'สั่งปิดแอร์' : 'สั่งเปิดแอร์'}
          disabled={disabled}
          onClick={() => setPower(!telemetry?.ac_on)}
        >
          <Icon name="power" />
        </button>
        <span className="power-label" role="status">
          {telemetry?.ac_on ? 'เปิดแอร์' : 'ปิดแอร์'}
        </span>
        <p className="unconfirmed">ยังไม่ยืนยันสถานะแอร์จริง</p>

        <div className="temp-control">
          <button type="button" aria-label="ลดอุณหภูมิ" disabled={disabled || setTemp <= TEMP_MIN} onClick={() => adjustTemp(-1)}>
            <Icon name="minus" />
          </button>
          <div>
            <output aria-live="polite">
              <span>{setTemp}</span>
              <sup>°C</sup>
            </output>
            <span>อุณหภูมิเป้าหมาย</span>
          </div>
          <button type="button" aria-label="เพิ่มอุณหภูมิ" disabled={disabled || setTemp >= TEMP_MAX} onClick={() => adjustTemp(1)}>
            <Icon name="plus" />
          </button>
        </div>

        {learnedMode && (
          <div className="control-group">
            <label id="calibrateLabel">ซิงค์อุณหภูมิจริง (ดูจากจอแอร์)</label>
            <div className="ctl-actions">
              <input
                type="number"
                inputMode="numeric"
                aria-labelledby="calibrateLabel"
                placeholder={`${TEMP_MIN}-${TEMP_MAX}`}
                value={calibrateInput}
                disabled={disabled}
                onChange={(e) => setCalibrateInput(e.target.value)}
              />
              <button type="button" className="btn-secondary" disabled={disabled || calibrateInput === ''} onClick={calibrateTemp}>
                ซิงค์
              </button>
            </div>
          </div>
        )}

        {!learnedMode && (
          <div className="control-group">
            <label id="modeLabel">โหมด</label>
            <div className="seg" role="group" aria-labelledby="modeLabel">
              {AC_MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  disabled={disabled}
                  className={telemetry?.ac_mode === m.value ? 'sel' : ''}
                  onClick={() => send('mode', m.value)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {!learnedMode && (
          <div className="control-group">
            <label id="fanLabel">แรงลม</label>
            <div className="seg" role="group" aria-labelledby="fanLabel">
              {AC_FANS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  disabled={disabled}
                  className={telemetry?.ac_fan === f.value ? 'sel' : ''}
                  onClick={() => send('fan', f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="ctl-actions">
          <button type="button" className="btn-secondary" disabled={disabled} onClick={() => send('sync')}>
            ซิงค์สถานะ
          </button>
          <button type="button" className="btn-secondary" disabled={disabled} onClick={() => send('extend')}>
            ขยายเวลาตาราง
          </button>
        </div>
      </div>

      <div className="card command-card">
        <div className="card-title">
          <span>
            <Icon name="zap" />
            คำสั่งล่าสุด
          </span>
        </div>
        <strong>{telemetry?.ac_on ? 'เปิดแอร์' : 'ปิดแอร์'}</strong>
        <p>ยังไม่ยืนยันสถานะแอร์จริง</p>
      </div>

      <SensorPanel telemetry={telemetry} />
    </section>
  )
}
