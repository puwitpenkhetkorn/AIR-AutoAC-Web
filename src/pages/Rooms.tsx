import { useNavigate } from 'react-router-dom'
import { roomDisplayName, useRooms } from '../context/RoomContext'
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews'
import { Icon } from '../components/IconSprite'

const TODAY = new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })

// SC-M03 — รายการห้อง (+ สถานะออนไลน์)
export default function Rooms() {
  const { rooms, roomsLoading, roomsError, selectRoom, reload } = useRooms()
  const navigate = useNavigate()

  return (
    <section className="page" data-screen="SC-M03">
      <div className="home-head">
        <div>
          <p className="eyebrow">{TODAY}</p>
          <h2 className="page-title home-title">ห้องเรียน</h2>
        </div>
      </div>

      {roomsLoading && rooms.length === 0 ? (
        <LoadingView />
      ) : roomsError ? (
        <ErrorView text={roomsError} onRetry={reload} />
      ) : rooms.length === 0 ? (
        <EmptyView text="ยังไม่มีห้องที่มอบหมายให้คุณ" />
      ) : (
        <ul className="room-list">
          {rooms.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="room-row"
                onClick={() => {
                  selectRoom(r.id)
                  navigate('/room')
                }}
              >
                <span>
                  <Icon name="airvent" />
                  {roomDisplayName(r)}
                </span>
                <span className={`badge ${r.active ? 'green' : 'red'}`}>{r.active ? 'ออนไลน์' : 'ออฟไลน์'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
