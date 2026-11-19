import { usePushNotifications } from '../context/PushNotificationContext'
import { Icon } from './IconSprite'

// แบนเนอร์เด้งแจ้งเตือนบนเว็บ — ใช้ .push-banner ที่มีอยู่แล้วใน index.css
export default function PushBanner() {
  const { items, dismiss } = usePushNotifications()
  if (items.length === 0) return null

  return (
    <div aria-live="assertive">
      {items.map((item, i) => (
        <div key={item.id} className="push-banner" style={{ top: `calc(${8 + i * 72}px + env(safe-area-inset-top))` }}>
          <div className="push-main">
            <span className="push-icon" aria-hidden="true">
              <Icon name="bell" />
            </span>
            <span>
              <strong>{item.title}</strong>
              {item.body && <small>{item.body}</small>}
            </span>
          </div>
          <button type="button" className="push-x" aria-label="ปิด" onClick={() => dismiss(item.id)}>
            <Icon name="x" />
          </button>
        </div>
      ))}
    </div>
  )
}
