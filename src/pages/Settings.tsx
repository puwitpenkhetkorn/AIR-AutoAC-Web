import { useAuth } from '../context/AuthContext'
import { useRooms } from '../context/RoomContext'
import { useTelemetry } from '../hooks/useTelemetry'
import { useRpc } from '../hooks/useRpc'
import { ErrorView, LoadingView } from '../components/StateViews'
import RoomSelect from '../components/RoomSelect'
import { Icon } from '../components/IconSprite'
import { Link } from 'react-router-dom'

// SC-M09 — ตั้งค่า (ค่าตั้งแบบสไลเดอร์ ตาม SPEC.md ข้อ 4)
export default function Settings() {
  const { role, userId, logout } = useAuth()
  const { selectedRoom } = useRooms()
  const deviceId = selectedRoom?.id ?? null
  const { settings, active, loading, error, refresh } = useTelemetry(deviceId)
  const { send, sending } = useRpc(deviceId)
  const isAdmin = role === 'ADMIN'
  const offline = active === false

  async function setSetting(key: string, value: number | boolean) {
    await send('setSetting', { key, value })
    refresh()
  }

  const s = settings ?? {}

  return (
    <section className="page" data-screen="SC-M09">
      <header className="page-header">
        <span className="header-spacer" />
        <h2 className="page-title">ตั้งค่า</h2>
        <span className="header-action" />
      </header>

      <RoomSelect />

      <div className="profile-card">
        <div className="avatar" aria-hidden="true">
          {isAdmin ? 'A' : 'U'}
        </div>
        <span>
          <b>{userId ?? '—'}</b>
          <small>{isAdmin ? 'ผู้ดูแลระบบ' : 'อาจารย์ผู้สอน'}</small>
        </span>
        <span className="badge teal">{isAdmin ? 'Admin' : 'User'}</span>
      </div>

      {!isAdmin && (
        <p className="readonly">
          <Icon name="lock" />
          การตั้งค่านี้ดูได้อย่างเดียว เฉพาะผู้ดูแลที่แก้ไขได้
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

      {loading && !settings ? (
        <LoadingView />
      ) : error && !settings ? (
        <ErrorView text={error} onRetry={refresh} />
      ) : (
        <div className="card">
          <h3 className="section-caption">การทำงานอัตโนมัติ</h3>
          <div className="slider-list">
            <div className="slider-row">
              <div>
                <label>ไม่พบการเคลื่อนไหว</label>
                <b>{s.emptyMin ?? 15} นาที</b>
              </div>
              <input
                type="range"
                min={5}
                max={60}
                disabled={!isAdmin || sending}
                value={s.emptyMin ?? 15}
                onChange={(e) => setSetting('emptyMin', Number(e.target.value))}
              />
            </div>
            <div className="slider-row">
              <div>
                <label>เตือนก่อนปิด</label>
                <b>{s.graceSec ?? 60} วินาที</b>
              </div>
              <input
                type="range"
                min={30}
                max={300}
                disabled={!isAdmin || sending}
                value={s.graceSec ?? 60}
                onChange={(e) => setSetting('graceSec', Number(e.target.value))}
              />
            </div>
            <div className="slider-row">
              <div>
                <label>เปิดเมื่อร้อน</label>
                <b>{s.hot ?? 27} °C</b>
              </div>
              <input
                type="range"
                min={24}
                max={32}
                disabled={!isAdmin || sending}
                value={s.hot ?? 27}
                onChange={(e) => setSetting('hot', Number(e.target.value))}
              />
            </div>
            <div className="slider-row">
              <div>
                <label>เปิดล่วงหน้า</label>
                <b>{s.preOpenMin ?? 10} นาที</b>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                disabled={!isAdmin || sending}
                value={s.preOpenMin ?? 10}
                onChange={(e) => setSetting('preOpenMin', Number(e.target.value))}
              />
            </div>
            <div className="auto-row">
              <span>
                <b>เปิดอัตโนมัติเมื่อร้อน</b>
              </span>
              <button
                type="button"
                className="toggle"
                role="switch"
                aria-checked={Boolean(s.autoOn)}
                disabled={!isAdmin || sending}
                onClick={() => setSetting('autoOn', !s.autoOn)}
              >
                <span />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card menu-list">
        <Link to="/alerts">
          <span>
            <Icon name="bell" />
            การแจ้งเตือน
          </span>
          <Icon name="chevron-right" className="ico chev" />
        </Link>
        <button type="button" className="logout" onClick={logout}>
          <span>
            <Icon name="power" />
            ออกจากระบบ
          </span>
          <Icon name="chevron-right" className="ico chev" />
        </button>
      </div>

      <p className="version">AIR — Auto AC Controller</p>
    </section>
  )
}
