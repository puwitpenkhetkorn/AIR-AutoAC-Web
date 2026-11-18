import { useState } from 'react'
import { Icon } from '../components/IconSprite'

const STORAGE_KEY = 'air.sdlog.address'
const DEFAULT_ADDRESS = 'autoac.local'

// หน้าต่างดู log บน microSD ของบอร์ด — ฝังเว็บเซิร์ฟเวอร์ในตัวบอร์ด (web_task.cpp) ผ่าน iframe
// ใช้ได้เฉพาะตอนเครื่องที่เปิดหน้านี้อยู่ใน LAN เดียวกับบอร์ด (ไม่ผ่าน ThingsBoard/อินเทอร์เน็ต)
export default function SdLog() {
  const [address, setAddress] = useState(() => localStorage.getItem(STORAGE_KEY) || DEFAULT_ADDRESS)
  const [loadedAddress, setLoadedAddress] = useState(address)

  function openViewer() {
    const trimmed = address.trim() || DEFAULT_ADDRESS
    localStorage.setItem(STORAGE_KEY, trimmed)
    setAddress(trimmed)
    setLoadedAddress(trimmed)
  }

  const url = `http://${loadedAddress}/`

  return (
    <section className="page" data-screen="SC-SDLOG">
      <header className="page-header">
        <span className="header-spacer" />
        <h2 className="page-title">Log บน microSD</h2>
        <span className="header-action" />
      </header>

      <p className="section-caption">
        ดูไฟล์ log บน microSD ของบอร์ดโดยตรง — ต้องอยู่ในวง WiFi เดียวกับบอร์ด (ไม่ผ่านอินเทอร์เน็ต)
      </p>

      <div className="card">
        <label id="sdlogAddrLabel" className="section-caption">ที่อยู่บอร์ด (hostname หรือ IP)</label>
        <div className="ctl-actions">
          <input
            type="text"
            aria-labelledby="sdlogAddrLabel"
            placeholder="autoac.local หรือ 192.168.1.xxx"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <button type="button" className="btn-secondary" onClick={openViewer}>
            เชื่อมต่อ
          </button>
        </div>
        <a className="sdlog-newtab" href={url} target="_blank" rel="noreferrer">
          <Icon name="share" />
          เปิดในแท็บใหม่
        </a>
      </div>

      <div className="card sdlog-frame-card">
        <iframe
          key={loadedAddress}
          src={url}
          title="AIR microSD Log Viewer"
          className="sdlog-frame"
        />
      </div>
    </section>
  )
}
